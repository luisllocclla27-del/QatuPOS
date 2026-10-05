"""Run the unchanged parent validator, saving its report inside the pilot only."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

pilot = Path(__file__).resolve().parents[1]
source = pilot.parent / "scripts" / "validate_sdd.py"
sys.path.insert(0, str(source.parent))
spec = spec_from_file_location("qatu_planning_validator", source)
module = module_from_spec(spec)
spec.loader.exec_module(module)
module.REPORT = pilot / "docs" / "evidence" / "planning-validation.json"
sys.exit(module.main())
