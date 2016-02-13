import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import FIXTURES from 'dummy/tests/helpers/fixtures';
import DS from 'ember-data';
import LSAdapter from 'ember-localstorage-adapter/adapters/ls-adapter';

import {module, test} from 'qunit';
const {run, get} = Ember;

let env, store, registry, List, Item, Order, Hour, Person;

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

    Order = DS.Model.extend({
      name: DS.attr('string'),
      b: DS.attr('boolean'),
      hours: DS.hasMany('hour', {async: true})
    });

    Hour = DS.Model.extend({
      name: DS.attr('string'),
      amount: DS.attr('number'),
      order: DS.belongsTo('order', {async: true})
    });

    Person = DS.Model.extend({
      name: DS.attr('string'),
      birthdate: DS.attr('date')
    });

    env = setupStore({
      list: List,
      item: Item,
      order: Order,
      hour: Hour,
      person: Person,
      adapter: LSAdapter
    });
    store = env.store;
    registry = env.registry;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('existence', function(assert) {
  const lsAdapter = store.adapterFor('list');
  const lsSerializer = store.serializerFor('list');
  assert.ok(lsAdapter, 'LSAdapter exists');
  assert.ok(lsSerializer, 'LSSerializer exists');
});

test('find with id', function(assert) {
  assert.expect(3);

  run(store, 'findRecord', 'list', 'l1').then(assert.wait(list => {
    console.log(list);
    console.log(list.toString());
    assert.equal(get(list, 'id'), 'l1', 'id is loaded correctly');
    assert.equal(get(list, 'name'), 'one', 'name is loaded correctly');
    assert.equal(get(list, 'done'), 'true', 'done is loaded correctly');
  })).catch(err => {
    assert.ok(true);
    console.log(err.toString());
  });
});


