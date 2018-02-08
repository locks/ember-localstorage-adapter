/* global localStorage */
import { all } from 'rsvp';

import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import FIXTURES from 'dummy/tests/helpers/fixtures';
import DS from 'ember-data';
import LSAdapter from 'ember-localstorage-adapter/adapters/ls-adapter';

import { module, test } from 'qunit';

let env, store, registry, List, Item;

module('integration/serializers/ls-serializer - LSSerializer', {
  beforeEach() {
    localStorage.setItem('DS.LSAdapter', JSON.stringify(FIXTURES));

    List = DS.Model.extend({
      name: DS.attr('string'),
      done: DS.attr('boolean'),
      items: DS.hasMany('item', {async: true})
    });

    Item = DS.Model.extend({
      name: DS.attr('string'),
      list: DS.belongsTo('list', {async: true})
    });

    env = setupStore({
      list: List,
      item: Item,
      adapter: LSAdapter
    });
    store = env.store;
    registry = env.registry;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('serializeHasMany respects keyForRelationship', function(assert) {
  assert.expect(1);
  const done = assert.async();
  store.serializerFor('list').reopen({
    keyForRelationship(key /*type*/) {
      return key.toUpperCase();
    }
  });

  const list = run(store, 'createRecord', 'list', {name: 'Rails is omakase', id: 1});
  const comment = run(store, 'createRecord', 'item', {name: 'Omakase is delicious', list, id: 1});

  return all([list, comment]).then(() => {
    let json = {};
    const snapshot = list._createSnapshot();
    store.serializerFor('list').serializeHasMany(snapshot, json, {
      key: 'items', options: {}
    });
    assert.deepEqual(json, {ITEMS: ['1']});

    registry.unregister('serializer:list');
    done();
  });
});

test('normalizeArrayResponse calls normalizeSingleResponse', function(assert) {
  assert.expect(1);
  const done = assert.async();
  let callCount = 0;

  store.serializerFor('list').reopen({
    normalizeSingleResponse: function(store, type, payload) {
      callCount++;
      return this.normalize(type, payload);
    }
  });

  run(store, 'findAll', 'list').then(() => {
    assert.equal(callCount, 3);
    done();
  });

  registry.unregister('serializer:list');
});

