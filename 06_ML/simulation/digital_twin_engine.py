import os
import sys
from datetime import datetime, timedelta
from typing import Optional, List

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from twin_state_schema import (
    TwinState, TelemetryInput, SoilState, HydrogelState, 
    MulchState, CropState, IntelligenceDiagnosis, 
    IntelligenceEvent, Intervention, MachineLearningPredictions
)
from twin_state_synchronizer import DigitalTwinStateSynchronizer
from substrate_intelligence_engine import SubstrateIntelligenceEngine
from database import init_db, DEFAULT_DB_PATH, TwinStateLog, TwinEventLog, TwinInterventionLog

class DigitalTwinEngine:
    """
    Closed-Loop Digital Twin Engine for Apollo AgriVerse.
    Feeds intelligence interventions directly back into physical state transitions,
    and supports seamless resume from SQLite (load_latest_state).
    """
    def __init__(self, db_url=DEFAULT_DB_PATH, model_dir=None):
        self.synchronizer = DigitalTwinStateSynchronizer(model_dir=model_dir)
        self.intelligence = SubstrateIntelligenceEngine()
        self.Session = init_db(db_url)
        self.current_state: Optional[TwinState] = None
        
        # Load last known state from SQLite database on startup
        self.load_latest_state()

    def load_latest_state(self):
        """Resumes simulation state directly from SQLite history if available."""
        session = self.Session()
        try:
            last_record = session.query(TwinStateLog).order_by(TwinStateLog.timestamp.desc()).first()
            if last_record:
                print(f"[RECOVERED STATE] Resuming Digital Twin from last database entry: {last_record.timestamp.strftime('%Y-%m-%d')} (Stage: {last_record.crop_growth_stage})")
                
                # Reconstruct TwinState from SQLite record
                self.current_state = TwinState(
                    farm_id=last_record.farm_id,
                    timestamp=last_record.timestamp,
                    telemetry=TelemetryInput(
                        farm_id=last_record.farm_id,
                        air_temp_c=28.0, air_temp_max_c=32.0, air_temp_min_c=20.0,
                        humidity_pct=50.0, rainfall_mm=0.0, uv_index=6.0
                    ),
                    soil=SoilState(
                        soil_moisture_pct=last_record.soil_moisture_pct,
                        soil_temp_c=last_record.soil_temp_c,
                        nitrogen_mgkg=last_record.nitrogen_mgkg,
                        phosphorus_mgkg=last_record.phosphorus_mgkg,
                        potassium_mgkg=last_record.potassium_mgkg
                    ),
                    hydrogel=HydrogelState(
                        hydrogel_water_storage_pct=last_record.hydrogel_storage_pct,
                        hydrogel_release_rate_lhr=last_record.hydrogel_release_rate_lhr
                    ),
                    mulch=MulchState(
                        mulch_degradation_pct=last_record.mulch_degradation_pct,
                        effective_mulch_cooling_c=last_record.effective_mulch_cooling_c
                    ),
                    crop=CropState(
                        growth_stage=last_record.crop_growth_stage,
                        cumulative_gdd=last_record.cumulative_gdd
                    ),
                    intelligence=IntelligenceDiagnosis(soil_health_index="OPTIMAL"),
                    predictions=MachineLearningPredictions(
                        predicted_required_hydrogel_storage_pct=last_record.predicted_hydrogel_req_pct,
                        predicted_grape_yield_tons_ha=last_record.predicted_yield_tons_ha
                    )
                )
            else:
                print("[NEW SIMULATION] No prior SQLite history found. Starting fresh Digital Twin instance.")
        except Exception as e:
            print(f"[DB LOAD NOTICE] Starting fresh: {e}")
        finally:
            session.close()

    def step(self, telemetry_dict: dict, current_timestamp: datetime = None, executed_interventions: List[Intervention] = None) -> TwinState:
        if current_timestamp is None:
            current_timestamp = datetime.utcnow()

        telemetry = TelemetryInput(**telemetry_dict)
        if executed_interventions is None:
            executed_interventions = []

        # 1. Physical State Transition (S_t-1 + Telemetry + Interventions -> S_t)
        prev_physics = self.current_state.model_dump() if self.current_state else None
        
        # Inject executed feedback interventions into physical synchronizer
        sync_output = self.synchronizer.sync_daily_state(
            telemetry_data=telemetry_dict, 
            previous_state=prev_physics,
            interventions=[i.model_dump() for i in executed_interventions]
        )
        
        physics = sync_output["digital_twin_state"]
        current_stage = physics["crop_phenology"]["growth_stage"]

        # 2. Closed-Loop Substrate Intelligence Diagnosis
        soil_diag = self.intelligence.evaluate_soil(physics["soil"], growth_stage=current_stage)
        hydro_diag = self.intelligence.evaluate_hydrogel(physics["hydrogel"], soil_diag["soil_demands"])
        mulch_diag = self.intelligence.evaluate_mulch(physics["mulch"], soil_diag["soil_demands"])

        events: List[IntelligenceEvent] = []
        new_interventions: List[Intervention] = []

        # Parse Soil Events & Fertigation Decisions
        for demand in soil_diag.get("soil_demands", []):
            events.append(IntelligenceEvent(
                component="SOIL", event_type=demand["type"], severity="HIGH",
                reason=f"Stage boundary alert: {demand['type']}", action_taken=demand["action"]
            ))

        # Parse Hydrogel Decisions (CLOSED-LOOP FEEDBACK TRIPPED HERE)
        if hydro_diag.get("hydrogel_operational_status") == "ACTIVE_RELEASE":
            release_rate = physics["hydrogel"]["hydrogel_release_rate_lhr"]
            events.append(IntelligenceEvent(
                component="HYDROGEL", event_type="ACTIVE_RELEASE", severity="MODERATE",
                reason=f"Osmotic release responding to soil demand", action_taken=hydro_diag["recommended_action"]
            ))
            # Create physical intervention feedable to next timestep
            new_interventions.append(Intervention(
                component="HYDROGEL", action_type="OSMOTIC_WATER_RELEASE",
                applied_quantity=round(release_rate * 2.5, 2), unit="L", status="EXECUTED"
            ))

        # Parse Mulch Decisions
        if mulch_diag.get("mulch_integrity_status") != "FUNCTIONAL":
            events.append(IntelligenceEvent(
                component="MULCH", event_type=mulch_diag["mulch_integrity_status"], severity="HIGH",
                reason=f"Degradation at {mulch_diag['degradation_pct']}%", action_taken=mulch_diag["recommended_action"]
            ))

        # 3. Assemble Strongly-Typed Pydantic TwinState Object
        self.current_state = TwinState(
            farm_id=telemetry.farm_id,
            timestamp=current_timestamp,
            telemetry=telemetry,
            soil=SoilState(**physics["soil"]),
            hydrogel=HydrogelState(**physics["hydrogel"]),
            mulch=MulchState(**physics["mulch"]),
            crop=CropState(
                growth_stage=current_stage,
                cumulative_gdd=physics["crop_phenology"]["cumulative_gdd"]
            ),
            intelligence=IntelligenceDiagnosis(
                soil_health_index=soil_diag["soil_health_index"],
                events=events,
                executed_interventions=new_interventions
            ),
            predictions=MachineLearningPredictions(
                predicted_required_hydrogel_storage_pct=sync_output["ml_predictions"]["predicted_required_hydrogel_storage_pct"],
                predicted_grape_yield_tons_ha=sync_output["ml_predictions"]["predicted_grape_yield_tons_ha"]
            )
        )

        # 4. Save Record to Database Store
        session = self.Session()
        try:
            state_record = TwinStateLog(
                farm_id=self.current_state.farm_id,
                timestamp=self.current_state.timestamp,
                soil_moisture_pct=self.current_state.soil.soil_moisture_pct,
                soil_temp_c=self.current_state.soil.soil_temp_c,
                nitrogen_mgkg=self.current_state.soil.nitrogen_mgkg,
                phosphorus_mgkg=self.current_state.soil.phosphorus_mgkg,
                potassium_mgkg=self.current_state.soil.potassium_mgkg,
                hydrogel_storage_pct=self.current_state.hydrogel.hydrogel_water_storage_pct,
                hydrogel_release_rate_lhr=self.current_state.hydrogel.hydrogel_release_rate_lhr,
                mulch_degradation_pct=self.current_state.mulch.mulch_degradation_pct,
                effective_mulch_cooling_c=self.current_state.mulch.effective_mulch_cooling_c,
                crop_growth_stage=self.current_state.crop.growth_stage,
                cumulative_gdd=self.current_state.crop.cumulative_gdd,
                predicted_hydrogel_req_pct=self.current_state.predictions.predicted_required_hydrogel_storage_pct,
                predicted_yield_tons_ha=self.current_state.predictions.predicted_grape_yield_tons_ha
            )
            session.add(state_record)
            session.flush()

            # Save Events
            for evt in self.current_state.intelligence.events:
                session.add(TwinEventLog(
                    state_log_id=state_record.id, timestamp=self.current_state.timestamp,
                    component=evt.component, event_type=evt.event_type,
                    severity=evt.severity, action_taken=evt.action_taken
                ))

            # Save Interventions
            for itv in self.current_state.intelligence.executed_interventions:
                session.add(TwinInterventionLog(
                    state_log_id=state_record.id, timestamp=self.current_state.timestamp,
                    component=itv.component, action_type=itv.action_type,
                    applied_quantity=itv.applied_quantity, unit=itv.unit, status=itv.status
                ))

            session.commit()
        except Exception as e:
            session.rollback()
            print(f"Database logging error: {e}")
        finally:
            session.close()

        return self.current_state

    def simulate_crop_lifecycle(self, days: int = 90, start_date: datetime = None):
        """Runs continuous simulation loop feeding interventions forward."""
        if start_date is None:
            start_date = self.current_state.timestamp if self.current_state else datetime(2026, 8, 1)

        print(f"\n--- STARTING {days}-DAY CLOSED-LOOP SIMULATION ---")
        active_interventions: List[Intervention] = []

        for d in range(days):
            current_time = start_date + timedelta(days=d)
            sample_telemetry = {
                "farm_id": "NASIK_GRAPE_PARCEL_04",
                "air_temp_c": 28.0 + (d * 0.08),
                "air_temp_max_c": 33.0 + (d * 0.08),
                "air_temp_min_c": 18.0,
                "humidity_pct": max(30.0, 65.0 - (d * 0.2)),
                "rainfall_mm": 20.0 if d in [10, 25, 60] else 0.0,
                "uv_index": min(11.0, 6.0 + (d * 0.05))
            }
            
            # Run step passing interventions calculated from previous step
            state = self.step(sample_telemetry, current_timestamp=current_time, executed_interventions=active_interventions)
            active_interventions = state.intelligence.executed_interventions

            print(f"Day {d+1:02d} [{current_time.strftime('%Y-%m-%d')}]: Stage={state.crop.growth_stage:<18} | Soil Moisture={state.soil.soil_moisture_pct:.1f}% | Hydrogel Storage={state.hydrogel.hydrogel_water_storage_pct:.1f}% | Executed Interventions={len(active_interventions)}")

        print("\n--- CLOSED-LOOP CROP LIFECYCLE SIMULATION COMPLETE! ---")

if __name__ == "__main__":
    engine = DigitalTwinEngine()
    engine.simulate_crop_lifecycle(days=90)