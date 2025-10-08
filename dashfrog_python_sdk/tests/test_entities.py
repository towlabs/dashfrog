from dashfrog_python_sdk.entities import Entity


class _Entity(Entity):
    test: bool = True
    type: str
    value: float | int
    label: str | None = None


class TestEntity:
    def test_unmodified_entity_should_return_empty_list(self):
        entity = _Entity(type="test", value=1)
        assert entity.updated_fields() == []

    def test_modified_entity_should_return_modified_key_list(self):
        entity = _Entity(type="test", value=1)
        assert entity.updated_fields() == []
        entity.label = "test"
        assert entity.updated_fields() == ["label"]
        entity.test = False
        assert set(entity.updated_fields()).difference(["label", "test"]) == set()

    def test_modified_entity_should_return_dict_of_modified_values_only(self):
        entity = _Entity(type="test", value=1)
        assert entity.dump_updated_fields() == {}
        entity.label = "test"
        assert entity.dump_updated_fields() == {"label": "test"}
        entity.test = False
        assert entity.dump_updated_fields() == {"label": "test", "test": False}

    def test_modified_initial_values_should_not_be_dumped(self):
        entity = _Entity(type="test", value=1)
        dump = entity.model_dump(exclude_unset=False, exclude_defaults=False)
        assert "__initial_values" not in dump
        assert set(dump.keys()).difference({"test", "type", "value", "label"}) == set()
