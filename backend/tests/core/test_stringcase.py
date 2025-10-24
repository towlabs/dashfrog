"""
Comprehensive test cases for core.stringcase module.
Tests each function with multiple input scenarios using pytest.mark.parametrize.
"""

from core import stringcase

import pytest


class TestCamelCase:
    """Test cases for camelcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "helloWorld"),
            ("Hello_World", "helloWorld"),
            ("hello-world", "helloWorld"),
            ("hello.world", "helloWorld"),
            ("hello world", "helloWorld"),
            ("HelloWorld", "helloworld"),
            ("hello_world_test", "helloWorldTest"),
            ("HELLO_WORLD", "helloWorld"),
            ("_hello_world", "helloWorld"),
            ("-hello-world", "helloWorld"),
            (".hello.world", "helloWorld"),
            ("", ""),
            ("a", "a"),
            ("A", "a"),
            ("hello", "hello"),
            ("hello_world_foo_bar", "helloWorldFooBar"),
            ("123_hello_world", "123HelloWorld"),
            ("hello_123_world", "hello_123World"),  # Numbers don't trigger camelCase
        ],
    )
    def test_camelcase_variations(self, input_string, expected):
        """Test camelcase with various input formats."""
        assert stringcase.camelcase(input_string) == expected

    @pytest.mark.parametrize(
        "input_value,expected",
        [
            ("hello", "hello"),
            ("HELLO", "hello"),
            ("test_case", "testCase"),
        ],
    )
    def test_camelcase_string_inputs(self, input_value, expected):
        """Test camelcase with string inputs."""
        result = stringcase.camelcase(input_value)
        assert result == expected


class TestCapitalCase:
    """Test cases for capitalcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello", "Hello"),
            ("hello_world", "Hello_world"),
            ("HELLO", "HELLO"),
            ("helloWorld", "HelloWorld"),
            ("", ""),
            ("a", "A"),
            ("A", "A"),
            ("123hello", "123hello"),
            ("_hello", "_hello"),
            ("hello world", "Hello world"),
        ],
    )
    def test_capitalcase_variations(self, input_string, expected):
        """Test capitalcase with various input formats."""
        assert stringcase.capitalcase(input_string) == expected

    @pytest.mark.parametrize(
        "input_value",
        [
            123,
            456.789,
            True,
        ],
    )
    def test_capitalcase_non_string_inputs(self, input_value):
        """Test capitalcase handles non-string inputs."""
        result = stringcase.capitalcase(input_value)
        assert isinstance(result, str)
        assert result[0].isupper() or result[0].isdigit()


class TestConstCase:
    """Test cases for constcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "HELLO_WORLD"),
            ("helloWorld", "HELLO_WORLD"),
            ("HelloWorld", "HELLO_WORLD"),
            ("hello-world", "HELLO_WORLD"),
            ("hello.world", "HELLO_WORLD"),
            ("hello world", "HELLO_WORLD"),
            ("HELLO_WORLD", "H_E_L_L_O__W_O_R_L_D"),  # Each uppercase letter becomes snake_case
            ("hello", "HELLO"),
            ("", ""),
            ("a", "A"),
            ("hello_world_test", "HELLO_WORLD_TEST"),
            ("helloWorldTest", "HELLO_WORLD_TEST"),
        ],
    )
    def test_constcase_variations(self, input_string, expected):
        """Test constcase (upper snake case) with various input formats."""
        assert stringcase.constcase(input_string) == expected


class TestPascalCase:
    """Test cases for pascalcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "HelloWorld"),
            ("hello-world", "HelloWorld"),
            ("hello.world", "HelloWorld"),
            ("hello world", "HelloWorld"),
            ("helloWorld", "Helloworld"),
            ("HelloWorld", "Helloworld"),
            ("HELLO_WORLD", "HelloWorld"),
            ("hello", "Hello"),
            ("", ""),
            ("a", "A"),
            ("hello_world_test", "HelloWorldTest"),
            ("_hello_world", "HelloWorld"),
        ],
    )
    def test_pascalcase_variations(self, input_string, expected):
        """Test pascalcase with various input formats."""
        assert stringcase.pascalcase(input_string) == expected


class TestSnakeCase:
    """Test cases for snakecase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("helloWorld", "hello_world"),
            ("HelloWorld", "hello_world"),
            ("hello-world", "hello_world"),
            ("hello.world", "hello_world"),
            ("hello world", "hello_world"),
            ("hello_world", "hello_world"),
            ("HELLO_WORLD", "h_e_l_l_o__w_o_r_l_d"),
            ("hello", "hello"),
            ("", ""),
            ("a", "a"),
            ("A", "a"),
            ("helloWorldTest", "hello_world_test"),
            ("HTTPSConnection", "h_t_t_p_s_connection"),
        ],
    )
    def test_snakecase_variations(self, input_string, expected):
        """Test snakecase with various input formats."""
        assert stringcase.snakecase(input_string) == expected

    @pytest.mark.parametrize(
        "input_value",
        [
            123,
            456.789,
        ],
    )
    def test_snakecase_non_string_inputs(self, input_value):
        """Test snakecase handles non-string inputs."""
        result = stringcase.snakecase(input_value)
        assert isinstance(result, str)


class TestSpinalCase:
    """Test cases for spinalcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "hello-world"),
            ("helloWorld", "hello-world"),
            ("HelloWorld", "hello-world"),
            ("hello-world", "hello-world"),
            ("hello.world", "hello-world"),
            ("hello world", "hello-world"),
            ("hello", "hello"),
            ("", ""),
            ("a", "a"),
            ("helloWorldTest", "hello-world-test"),
        ],
    )
    def test_spinalcase_variations(self, input_string, expected):
        """Test spinalcase (kebab-case) with various input formats."""
        assert stringcase.spinalcase(input_string) == expected


class TestDotCase:
    """Test cases for dotcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "hello.world"),
            ("helloWorld", "hello.world"),
            ("HelloWorld", "hello.world"),
            ("hello-world", "hello.world"),
            ("hello.world", "hello.world"),
            ("hello world", "hello.world"),
            ("hello", "hello"),
            ("", ""),
            ("a", "a"),
            ("helloWorldTest", "hello.world.test"),
        ],
    )
    def test_dotcase_variations(self, input_string, expected):
        """Test dotcase with various input formats."""
        assert stringcase.dotcase(input_string) == expected


class TestBackslashCase:
    """Test cases for backslashcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "hello\\world"),
            ("helloWorld", "hello\\world"),
            ("HelloWorld", "hello\\world"),
            ("hello-world", "hello\\world"),
            ("hello.world", "hello\\world"),
            ("hello world", "hello\\world"),
            ("hello", "hello"),
            ("", ""),
            ("a", "a"),
            ("helloWorldTest", "hello\\world\\test"),
        ],
    )
    def test_backslashcase_variations(self, input_string, expected):
        """Test backslashcase with various input formats."""
        assert stringcase.backslashcase(input_string) == expected


class TestTitleCase:
    """Test cases for titlecase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "Hello World"),
            ("helloWorld", "Hello World"),
            ("HelloWorld", "Hello World"),
            ("hello-world", "Hello World"),
            ("hello.world", "Hello World"),
            ("hello world", "Hello World"),
            ("hello", "Hello"),
            ("", ""),
            ("a", "A"),
            ("helloWorldTest", "Hello World Test"),
            ("hello_world_foo_bar", "Hello World Foo Bar"),
        ],
    )
    def test_titlecase_variations(self, input_string, expected):
        """Test titlecase with various input formats."""
        assert stringcase.titlecase(input_string) == expected


class TestTrimCase:
    """Test cases for trimcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("  hello  ", "hello"),
            ("\thello\t", "hello"),
            ("\nhello\n", "hello"),
            ("   hello world   ", "hello world"),
            ("hello", "hello"),
            ("", ""),
            ("  ", ""),
            ("\t\n", ""),
            ("  hello  world  ", "hello  world"),
        ],
    )
    def test_trimcase_variations(self, input_string, expected):
        """Test trimcase with various whitespace scenarios."""
        assert stringcase.trimcase(input_string) == expected

    @pytest.mark.parametrize(
        "input_value,expected",
        [
            (123, "123"),
            (456.789, "456.789"),
            (True, "True"),
        ],
    )
    def test_trimcase_non_string_inputs(self, input_value, expected):
        """Test trimcase handles non-string inputs."""
        assert stringcase.trimcase(input_value) == expected


class TestAlphanumCase:
    """Test cases for alphanumcase function."""

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello_world", "helloworld"),
            ("hello-world", "helloworld"),
            ("hello.world", "helloworld"),
            ("hello world", "helloworld"),
            ("hello@world", "helloworld"),
            ("hello#world!", "helloworld"),
            ("hello123", "hello123"),
            ("123hello456", "123hello456"),
            ("!@#$%", ""),
            ("", ""),
            ("abc123XYZ", "abc123XYZ"),
            ("test_case-123.abc", "testcase123abc"),
        ],
    )
    def test_alphanumcase_variations(self, input_string, expected):
        """Test alphanumcase removes all non-alphanumeric characters."""
        assert stringcase.alphanumcase(input_string) == expected

    @pytest.mark.parametrize(
        "input_value",
        [
            123,
            456.789,
            True,
        ],
    )
    def test_alphanumcase_non_string_inputs(self, input_value):
        """Test alphanumcase handles non-string inputs."""
        result = stringcase.alphanumcase(input_value)
        assert isinstance(result, str)
        assert result.isalnum() or result == ""


class TestEdgeCases:
    """Test edge cases across multiple functions."""

    @pytest.mark.parametrize(
        "func_name,input_string",
        [
            ("camelcase", ""),
            ("capitalcase", ""),
            ("constcase", ""),
            ("pascalcase", ""),
            ("snakecase", ""),
            ("spinalcase", ""),
            ("dotcase", ""),
            ("backslashcase", ""),
            ("titlecase", ""),
            ("trimcase", ""),
            ("alphanumcase", ""),
        ],
    )
    def test_empty_string_handling(self, func_name, input_string):
        """Test that all functions handle empty strings gracefully."""
        func = getattr(stringcase, func_name)
        result = func(input_string)
        assert result == ""

    @pytest.mark.parametrize(
        "func_name,input_string",
        [
            ("camelcase", "a"),
            ("capitalcase", "a"),
            ("constcase", "a"),
            ("pascalcase", "a"),
            ("snakecase", "a"),
            ("spinalcase", "a"),
            ("dotcase", "a"),
            ("backslashcase", "a"),
            ("titlecase", "a"),
            ("trimcase", "a"),
            ("alphanumcase", "a"),
        ],
    )
    def test_single_character_handling(self, func_name, input_string):
        """Test that all functions handle single characters."""
        func = getattr(stringcase, func_name)
        result = func(input_string)
        assert isinstance(result, str)
        assert len(result) > 0


class TestChainedConversions:
    """Test chaining multiple case conversions."""

    @pytest.mark.parametrize(
        "original,expected_snake,expected_camel,expected_pascal",
        [
            ("helloWorld", "hello_world", "helloWorld", "HelloWorld"),
            ("HelloWorld", "hello_world", "helloWorld", "HelloWorld"),
            ("hello_world", "hello_world", "helloWorld", "HelloWorld"),
        ],
    )
    def test_conversion_chain(self, original, expected_snake, expected_camel, expected_pascal):
        """Test converting between different cases maintains consistency."""
        # Convert to snake first
        snake = stringcase.snakecase(original)
        assert snake == expected_snake

        # From snake to camel
        camel = stringcase.camelcase(snake)
        assert camel == expected_camel

        # From snake to pascal
        pascal = stringcase.pascalcase(snake)
        assert pascal == expected_pascal


class TestUnicodeAndSpecialCharacters:
    """Test functions with unicode and special characters."""

    @pytest.mark.parametrize(
        "func_name,input_string",
        [
            ("snakecase", "café_world"),
            ("camelcase", "hello_café"),
            ("titlecase", "hello_world_café"),
        ],
    )
    def test_unicode_handling(self, func_name, input_string):
        """Test functions handle unicode characters."""
        func = getattr(stringcase, func_name)
        result = func(input_string)
        assert isinstance(result, str)

    @pytest.mark.parametrize(
        "input_string,expected",
        [
            ("hello@world", "helloworld"),
            ("test$value", "testvalue"),
            ("a&b#c", "abc"),
            ("123!@#", "123"),
        ],
    )
    def test_special_characters_in_alphanumcase(self, input_string, expected):
        """Test alphanumcase properly removes special characters."""
        assert stringcase.alphanumcase(input_string) == expected
