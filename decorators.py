from opentelemetry import trace


def step(name: str, **attributes):
    def decorator(func):
        def wrapper(*args, **kwargs):
            tracer = trace.get_tracer(__name__)
            with tracer.start_span(name, attributes=attributes):
                return func(*args, **kwargs)

        return wrapper

    return decorator
