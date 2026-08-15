import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

# Absolute path resolution to ensure apollo_twin.db is always created inside 06_ML/simulation/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = f"sqlite:///{os.path.join(BASE_DIR, 'apollo_twin.db')}"


class TwinStateLog(Base):
    """Time-series table capturing every simulation step."""
    __tablename__ = 'twin_state_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String(50), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Substrate Physics States
    soil_moisture_pct = Column(Float)
    soil_temp_c = Column(Float)
    nitrogen_mgkg = Column(Float)
    phosphorus_mgkg = Column(Float)
    potassium_mgkg = Column(Float)
    
    hydrogel_storage_pct = Column(Float)
    hydrogel_release_rate_lhr = Column(Float)
    
    mulch_degradation_pct = Column(Float)
    effective_mulch_cooling_c = Column(Float)
    
    crop_growth_stage = Column(String(50))
    cumulative_gdd = Column(Float)

    # Predictive ML Outputs
    predicted_hydrogel_req_pct = Column(Float)
    predicted_yield_tons_ha = Column(Float)

    # Relationships
    events = relationship("TwinEventLog", back_populates="state_log", cascade="all, delete-orphan")
    interventions = relationship("TwinInterventionLog", back_populates="state_log", cascade="all, delete-orphan")


class TwinEventLog(Base):
    """Captures intelligence decisions and alerts."""
    __tablename__ = 'twin_events_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_log_id = Column(Integer, ForeignKey('twin_state_logs.id'))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    component = Column(String(30))  # SOIL, HYDROGEL, MULCH
    event_type = Column(String(50)) # WATER_DEFICIT, THERMAL_STRESS, RELEASE_ACTIVE
    severity = Column(String(20))   # LOW, MODERATE, HIGH, CRITICAL
    action_taken = Column(Text)

    state_log = relationship("TwinStateLog", back_populates="events")


class TwinInterventionLog(Base):
    """Captures physical feedback interventions applied directly back into the twin state."""
    __tablename__ = 'twin_interventions_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    state_log_id = Column(Integer, ForeignKey('twin_state_logs.id'))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    component = Column(String(30))       # HYDROGEL, SOIL, MULCH
    action_type = Column(String(50))     # OSMOTIC_WATER_RELEASE, FERTIGATION, DRIP_IRRIGATION
    applied_quantity = Column(Float)     # Numerical value (e.g., 5.0)
    unit = Column(String(20))            # L, mg/kg, %
    status = Column(String(20), default="EXECUTED")  # EXECUTED, PENDING, FAILED

    state_log = relationship("TwinStateLog", back_populates="interventions")


class GroundTruthOutcome(Base):
    """Logs actual field harvest outcomes for future ML model retraining."""
    __tablename__ = 'ground_truth_outcomes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(String(50), nullable=False)
    crop_cycle_id = Column(String(50), nullable=False)
    harvest_date = Column(DateTime)
    
    actual_yield_tons_ha = Column(Float)
    predicted_yield_tons_ha = Column(Float)
    yield_error_margin = Column(Float)


def init_db(db_url=DEFAULT_DB_PATH):
    """Creates the SQLite database file and tables if they do not exist."""
    engine = create_engine(db_url, echo=False)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


if __name__ == "__main__":
    Session = init_db()
    print(f"Apollo AgriVerse SQLite database initialized successfully at:\n{os.path.join(BASE_DIR, 'apollo_twin.db')}")