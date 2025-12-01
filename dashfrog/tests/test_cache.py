"""Tests for cache utilities."""

import time

from dashfrog_python_sdk.cache import ttl_cache


def test_ttl_cache_caches_value():
    """Test that ttl_cache caches the return value."""
    call_count = 0

    @ttl_cache(ttl_seconds=1)
    def expensive_function():
        nonlocal call_count
        call_count += 1
        return "result"

    # First call should compute
    result1 = expensive_function()
    assert result1 == "result"
    assert call_count == 1

    # Second call should use cache
    result2 = expensive_function()
    assert result2 == "result"
    assert call_count == 1  # Should still be 1


def test_ttl_cache_expires_after_ttl():
    """Test that cached value expires after TTL."""
    call_count = 0

    @ttl_cache(ttl_seconds=0.1)  # 100ms TTL
    def expensive_function():
        nonlocal call_count
        call_count += 1
        return call_count

    # First call
    result1 = expensive_function()
    assert result1 == 1
    assert call_count == 1

    # Immediate second call uses cache
    result2 = expensive_function()
    assert result2 == 1
    assert call_count == 1

    # Wait for TTL to expire
    time.sleep(0.15)

    # Third call recomputes
    result3 = expensive_function()
    assert result3 == 2
    assert call_count == 2


def test_ttl_cache_with_arguments():
    """Test that ttl_cache handles different arguments correctly."""
    call_count = 0

    @ttl_cache(ttl_seconds=1)
    def add(a, b):
        nonlocal call_count
        call_count += 1
        return a + b

    # First call with (1, 2)
    result1 = add(1, 2)
    assert result1 == 3
    assert call_count == 1

    # Second call with same arguments uses cache
    result2 = add(1, 2)
    assert result2 == 3
    assert call_count == 1

    # Call with different arguments computes new value
    result3 = add(2, 3)
    assert result3 == 5
    assert call_count == 2

    # Original arguments still cached
    result4 = add(1, 2)
    assert result4 == 3
    assert call_count == 2


def test_ttl_cache_with_kwargs():
    """Test that ttl_cache handles keyword arguments correctly."""
    call_count = 0

    @ttl_cache(ttl_seconds=1)
    def greet(name, greeting="Hello"):
        nonlocal call_count
        call_count += 1
        return f"{greeting}, {name}!"

    # First call
    result1 = greet("Alice")
    assert result1 == "Hello, Alice!"
    assert call_count == 1

    # Same call uses cache
    result2 = greet("Alice")
    assert result2 == "Hello, Alice!"
    assert call_count == 1

    # Different kwargs computes new value
    result3 = greet("Alice", greeting="Hi")
    assert result3 == "Hi, Alice!"
    assert call_count == 2

    # Different positional computes new value
    result4 = greet("Bob")
    assert result4 == "Hello, Bob!"
    assert call_count == 3


def test_clear_cache():
    """Test that clear_cache() clears the cache."""
    call_count = 0

    @ttl_cache(ttl_seconds=10)
    def expensive_function():
        nonlocal call_count
        call_count += 1
        return "result"

    # First call
    expensive_function()
    assert call_count == 1

    # Second call uses cache
    expensive_function()
    assert call_count == 1

    # Clear cache
    expensive_function.clear_cache()

    # Next call recomputes
    expensive_function()
    assert call_count == 2


def test_get_cache_info():
    """Test that get_cache_info() returns cache statistics."""

    @ttl_cache(ttl_seconds=0.2)
    def func(x):
        return x * 2

    # Initially empty
    info = func.get_cache_info()
    assert info["total_entries"] == 0
    assert info["valid_entries"] == 0
    assert info["ttl_seconds"] == 0.2

    # After one call
    func(1)
    info = func.get_cache_info()
    assert info["total_entries"] == 1
    assert info["valid_entries"] == 1

    # After multiple calls with different args
    func(2)
    func(3)
    info = func.get_cache_info()
    assert info["total_entries"] == 3
    assert info["valid_entries"] == 3

    # After TTL expires
    time.sleep(0.25)
    info = func.get_cache_info()
    assert info["total_entries"] == 3
    assert info["valid_entries"] == 0  # All expired
    assert info["expired_entries"] == 3
