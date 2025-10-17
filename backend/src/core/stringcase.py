"""
String convert functions
"""

import re


def camelcase(string):
    """Convert string into camel case.
    Args:
        string: String to convert.
    Returns:
        string: Camel case string.
    """

    string = re.sub(r"^[\-_\.]", "", str(string.lower()))
    if not string:
        return string
    return string[0].lower() + re.sub(r"[\-_\.\s]([a-z])", lambda matched: matched.group(1).upper(), string[1:])


def capitalcase(string):
    """Convert string into capital case.
    First letters will be uppercase.
    Args:
        string: String to convert.
    Returns:
        string: Capital case string.
    """

    string = str(string)
    if not string:
        return string
    return string[0].upper() + string[1:]


def constcase(string):
    """Convert string into upper snake case.
    Join punctuation with underscore and convert letters into uppercase.
    Args:
        string: String to convert.
    Returns:
        string: Const cased string.
    """

    return snakecase(string).upper()


def pascalcase(string):
    """Convert string into pascal case.
    Args:
        string: String to convert.
    Returns:
        string: Pascal case string.
    """

    return capitalcase(camelcase(string))


def backslashcase(string):
    """Convert string into spinal case.
    Join punctuation with backslash.
    Args:
        string: String to convert.
    Returns:
        string: Spinal cased string.
    """
    str1 = re.sub(r"_", r"\\", snakecase(string))

    return str1


def snakecase(string):
    """Convert string into snake case.
    Join punctuation with underscore
    Args:
        string: String to convert.
    Returns:
        string: Snake cased string.
    """

    string = re.sub(r"[\-\.\s]", "_", str(string))
    if not string:
        return string
    return string[0].lower() + re.sub(r"[A-Z]", lambda matched: "_" + matched.group(0).lower(), string[1:])


def spinalcase(string):
    """Convert string into spinal case.
    Join punctuation with hyphen.
    Args:
        string: String to convert.
    Returns:
        string: Spinal cased string.
    """

    return re.sub(r"_", "-", snakecase(string))


def dotcase(string):
    """Convert string into dot case.
    Join punctuation with dot.
    Args:
        string: String to convert.
    Returns:
        string: Dot cased string.
    """

    return re.sub(r"_", ".", snakecase(string))


def titlecase(string):
    """Convert string into sentence case.
    First letter capped while each punctuations is capitalsed
    and joined with space.
    Args:
        string: String to convert.
    Returns:
        string: Title cased string.
    """

    return " ".join([capitalcase(word) for word in snakecase(string).split("_")])


def trimcase(string):
    """Convert string into trimmed string.
    Args:
        string: String to convert.
    Returns:
        string: Trimmed case string
    """

    return str(string).strip()


def alphanumcase(string):
    """Cuts all non-alphanumeric symbols,
    i.e. cuts all expect except 0-9, a-z and A-Z.
    Args:
        string: String to convert.
    Returns:
        string: String with cutted non-alphanumeric symbols.
    """
    return "".join(filter(str.isalnum, str(string)))
