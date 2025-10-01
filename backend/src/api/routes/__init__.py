from importlib import import_module
from os.path import dirname, basename, isfile, join
import glob


modules = glob.glob(join(dirname(__file__), "*.py"))
modules = [basename(f)[:-3] for f in modules if isfile(f) and not f.endswith("__init__.py")]

for module in modules:
    mod_name = module.removesuffix(".py")
    import_module("." + mod_name, package=__name__)
