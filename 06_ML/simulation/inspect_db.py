import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db, TwinStateLog, TwinEventLog, TwinInterventionLog

def inspect_database():
    Session = init_db()
    session = Session()

    print("=======================================================")
    print("      APOLLO AGRIVERSE DATABASE HISTORY INSPECTION      ")
    print("=======================================================\n")

    # 1. Total Records Summary
    total_states = session.query(TwinStateLog).count()
    total_events = session.query(TwinEventLog).count()
    total_interventions = session.query(TwinInterventionLog).count()
    
    print(f"Total Daily State Records Logged : {total_states}")
    print(f"Total Diagnostic Events Logged   : {total_events}")
    print(f"Total Executed Interventions     : {total_interventions}\n")

    # 2. Crop Lifecycle Stage Breakdown
    print("--- CROP LIFECYCLE STAGE BREAKDOWN ---")
    stages = session.query(TwinStateLog.crop_growth_stage).distinct().all()
    for s in stages:
        stage_name = s[0]
        count = session.query(TwinStateLog).filter(TwinStateLog.crop_growth_stage == stage_name).count()
        print(f"  • {stage_name:<20}: {count} days logged")

    # 3. Diagnostic Events Breakdown
    print("\n--- DIAGNOSTIC EVENTS BY COMPONENT ---")
    for comp in ["SOIL", "HYDROGEL", "MULCH"]:
        count = session.query(TwinEventLog).filter(TwinEventLog.component == comp).count()
        print(f"  • {comp:<10} Events: {count}")

    # 4. Executed Feedback Interventions Breakdown
    print("\n--- EXECUTED INTERVENTIONS LOGGED ---")
    interventions = session.query(TwinInterventionLog).all()
    if interventions:
        for itv in interventions[-5:]:  # Display last 5 logged interventions
            print(f"  [{itv.timestamp.strftime('%Y-%m-%d')}] [{itv.component}] Action: {itv.action_type:<22} | Quantity: {itv.applied_quantity} {itv.unit} | Status: {itv.status}")
    else:
        print("  • No physical interventions recorded yet.")

    print("\n=======================================================")
    session.close()

if __name__ == "__main__":
    inspect_database()