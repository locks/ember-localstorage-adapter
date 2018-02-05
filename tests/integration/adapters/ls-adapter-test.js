/* global localStorage */
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import FIXTURES from 'dummy/tests/helpers/fixtures';
import DS from 'ember-data';
import LSAdapter from 'ember-localstorage-adapter/adapters/ls-adapter';

import {module, test} from 'qunit';
const {run, get, set} = Ember;

let env, store, List, Item, Order, Hour, Person;

module('integration/adapters/ls-adapter - LSAdapter', {
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
  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('exists through the store', function(assert) {
  const lsAdapter = store.adapterFor('-default');
  const lsSerializer = store.serializerFor('-default');
  assert.ok(lsAdapter, 'LSAdapter exists');
  assert.ok(lsSerializer, 'LSSerializer exists');
});

test('find with id', function(assert) {
  assert.expect(3);
  const done = assert.async();
  run(store, 'findRecord', 'list', 'l1').then(list => {
    assert.equal(get(list, 'id'), 'l1', 'id is loaded correctly');
    assert.equal(get(list, 'name'), 'one', 'name is loaded correctly');
    assert.equal(get(list, 'done'), true, 'done is loaded correctly');
    done();
  });
});

test('find rejects promise for non-existing record', function(assert) {
  assert.expect(1);
  const done = assert.async();
  // using run like on the other tests makes the test fail.
  run(() => {
    store.findRecord('list', 'unknown').catch(() => {
      assert.ok(true);
      done();
    });
  });
});

test('query', function(assert) {
  assert.expect(2);
  const done = assert.async(2);

  run(store, 'query', 'list', {name: /one|two/}).then(records => {
    assert.equal(get(records, 'length'), 2, 'found results for /one|two/');
    done();
  });
  run(store, 'query', 'list', {name: /.+/, id: /l1/}).then(records => {
    assert.equal(get(records, 'length'), 1, 'found results for {name: /.+/, id: /l1/}');
    done();
  });
});

test('query resolves empty when there are no records', function(assert) {
  const done = assert.async();
  assert.expect(2);
  run(store, 'query', 'list', {name: /unknown/}).then(list => {
    assert.ok(Ember.isEmpty(list));
    assert.equal(store.hasRecordForId('list', 'unknown'), false);
    done();
  });
});

test('findAll', function(assert) {
  assert.expect(4);
  const done = assert.async();

  run(store, 'findAll', 'list').then(records => {
    assert.equal(get(records, 'length'), 3, '3 items were found');
    const [firstRecord, secondRecord, thirdRecord] = records.toArray();
    assert.equal(get(firstRecord, 'name'), 'one', 'First item name is one');
    assert.equal(get(secondRecord, 'name'), 'two', 'Second item name is two');
    assert.equal(get(thirdRecord, 'name'), 'three', 'Third item name is three');
    done();
  });
});

test('queryMany', function(assert) {
  assert.expect(11);
  const done = assert.async();
  run(store, 'query', 'order', { done: true }).then(records => {
    const [firstRecord, secondRecord, thirdRecord] = records.toArray();
    assert.equal(get(records, 'length'), 3, '3 orders were found');
    assert.equal(get(firstRecord, 'name'), 'one', 'First\'s order name is one');
    assert.equal(get(secondRecord, 'name'), 'three', 'Second\'s order name is three');
    assert.equal(get(thirdRecord, 'name'), 'four', 'Third\'s order name is four');

    const firstHours = firstRecord.get('hours'),
      secondHours = secondRecord.get('hours'),
      thirdHours = thirdRecord.get('hours');

    assert.equal(get(firstHours, 'length'), 2, 'Order one has two hours');
    assert.equal(get(secondHours, 'length'), 2, 'Order three has two hours');
    assert.equal(get(thirdHours, 'length'), 0, 'Order four has no hours');

    const [hourOne, hourTwo] = firstHours.toArray();
    const [hourThree, hourFour] = secondHours.toArray();
    assert.equal(get(hourOne, 'amount'), 4, 'Hour one has amount of 4');
    assert.equal(get(hourTwo, 'amount'), 3, 'Hour two has amount of 3');
    assert.equal(get(hourThree, 'amount'), 2, 'Hour three has amount of 2');
    assert.equal(get(hourFour, 'amount'), 1, 'Hour four has amount of 1');
    done();
  });
});

test('createRecord', function(assert) {
  assert.expect(5);
  const done = assert.async(2);
  const list = run(store, 'createRecord', 'list', {name: 'Rambo'});

  run(list, 'save').then(() => {
    store.query('list', {name: 'Rambo'}).then(records => {
      let record = records.objectAt(0);

      assert.equal(get(records, 'length'), 1, 'Only Rambo was found');
      assert.equal(get(record, 'name'), 'Rambo', 'Correct name');
      assert.equal(get(record, 'id'), list.id, 'Correct, original id');
      done();
    });
  });

  run(list, 'save').then(() => {
    store.findRecord('list', list.id).then(record => {
      assert.equal(get(record, 'name'), 'Rambo', 'Correct name');
      assert.equal(get(record, 'id'), list.id, 'Correct, original id');
      done();
    });
  });
});

test('updateRecords', function(assert) {
  assert.expect(3);
  const done = assert.async();
  const list = run(store, 'createRecord', 'list', {name: 'Rambo'});

  run(list, 'save').then(list => {
    return store.query('list', {name: 'Rambo'}).then(records => {
      let record = records.objectAt(0);
      record.set('name', 'Macgyver');
      return record.save();
    }).then(() => {
      return store.query('list', {name: 'Macgyver'}).then(records => {
        let record = records.objectAt(0);
        assert.equal(get(records, 'length'), 1, 'Only one record was found');
        assert.equal(get(record, 'name'), 'Macgyver', 'Updated name shows up');
        assert.equal(get(record, 'id'), list.id, 'Correct, original id');
        done();
      });
    });
  });
});

test('deleteRecord', function(assert) {
  assert.expect(2);
  const done = assert.async();

  const assertListIsDeleted = () => {
    return store.query('list', {name: 'one'}).then(list => {
      assert.ok(Ember.isEmpty(list), 'List was deleted');
      done();
    });
  };

  run(() => {
    store.query('list', {name: 'one'}).then(lists => {
      const list = lists.objectAt(0);
      assert.equal(get(list, 'id'), 'l1', 'Item exists');
      list.deleteRecord();
      list.on('didDelete', assertListIsDeleted);
      list.save();
    });
  });
});

test('changes in bulk', function(assert) {
  assert.expect(3);
  const done = assert.async();
  let promises;

  let listToUpdate = run(store, 'findRecord', 'list', 'l1'),
    listToDelete = run(store, 'findRecord', 'list', 'l2'),
    listToCreate = run(store, 'createRecord', 'list', {name: 'Rambo'});

  const updateList = (list) => {
    set(list, 'name', 'updatedName');
    return list;
  };

  const deleteList = (list) => {
    run(list, 'deleteRecord');
    return list;
  };

  promises = [
    listToCreate,
    listToUpdate.then(updateList),
    listToDelete.then(deleteList)
  ];

  Ember.RSVP.all(promises).then(lists => {
    return lists.map(list => {
      return list.save();
    });
  }).then(() => {

    let createdList = store.query('list', {name: 'Rambo'}).then(lists => {
      return assert.equal(get(lists, 'length'), 1, 'Record was created successfully');
    });
    let deletedList = store.findRecord('list', 'l2').then(list => {
      return assert.equal(get(list, 'length'), undefined, 'Record was deleted successfully');
    });
    let updatedList = store.findRecord('list', 'l1').then(list => {
      return assert.equal(get(list, 'name'), 'updatedName', 'Record was updated successfully');
    });

    return Ember.RSVP.all([createdList, deletedList, updatedList]).then(done);
  });
});

test('load hasMany association', function(assert) {
  assert.expect(4);
  const done = assert.async();

  run(store, 'findRecord', 'list', 'l1').then(list => {
    let items = get(list, 'items');

    let firstItem = get(items, 'firstObject'),
      lastItem = get(items, 'lastObject');

    assert.equal(get(firstItem, 'id'), 'i1', 'first item id is loaded correctly');
    assert.equal(get(firstItem, 'name'), 'one', 'first item name is loaded correctly');
    assert.equal(get(lastItem, 'id'), 'i2', 'last item id is loaded correctly');
    assert.equal(get(lastItem, 'name'), 'two', 'last item name is loaded correctly');
    done();
  });
});

test('load belongsTo association', function(assert) {
  assert.expect(2);
  const done = assert.async();

  run(store, 'findRecord', 'item', 'i1').then(item => {
    return get(item, 'list');
  }).then(list => {
    assert.equal(get(list, 'id'), 'l1', 'id is loaded correctly');
    assert.equal(get(list, 'name'), 'one', 'name is loaded correctly');
    done();
  });
});

test('saves belongsTo', function(assert) {
  assert.expect(2);
  let item, listId = 'l2';
  const done = assert.async();

  run(store, 'findRecord', 'list', listId).then(list => {
    item = store.createRecord('item', { name: 'three thousand' });
    set(item, 'list', list);

    return Ember.RSVP.all([list.save(), item.save()]);

  }).then(([list, item]) => {

    store.unloadAll('item');
    return store.findRecord('item', get(item, 'id'));
  }).then(item => {
    let list = get(item, 'list');
    assert.ok(get(item, 'list'), 'list is present');
    assert.equal(get(list, 'id'), listId, 'list is retrieved correctly');
    done();
  });
});

test('saves hasMany', function(assert) {
  assert.expect(1);
  let listId = 'l2';
  const done = assert.async();

  let list = run(store, 'findRecord', 'list', listId);
  let item = run(store, 'createRecord', 'item', {name: 'three thousand'});

  return Ember.RSVP.all([list, item]).then(([list, item]) => {
    get(list, 'items').pushObject(item);
    return Ember.RSVP.all([list.save(), item.save()]);
  }).then(() => {
    store.unloadAll('list');
    return store.findRecord('list', listId);
  }).then(list => {
    let item = get(list, 'items').objectAt(0);
    assert.equal(get(item, 'name'), 'three thousand', 'item is saved');
    done();
  });
});

test('date is loaded correctly', function(assert) {
  assert.expect(2);
  const done = assert.async();

  const date = new Date(1982, 5, 18);
  const person = run(store, 'createRecord', 'person', {
    name: 'Dan', birthdate: date
  });

  return run(person, 'save').then(() => {
    return store.query('person', {name: 'Dan'}).then(records => {
      const loadedPerson = get(records, 'firstObject');
      const birthdate = get(loadedPerson, 'birthdate');
      assert.ok((birthdate instanceof Date), 'Date should be loaded as an instance of Date');
      assert.equal(birthdate.getTime(), date.getTime(), 'Date content should be loaded correctly');
      done();
    });
  });
});

test('handles localStorage being unavailable', function(assert) {
  assert.expect(3);
  const done = assert.async();

  let calledGetnativeStorage = false;
  const handler = () => {
    calledGetnativeStorage = true;
  };
  var adapter = store.get('defaultAdapter');

  // We can't actually disable localStorage in PhantomJS, so emulate as closely as possible by
  // causing a wrapper method on the adapter to throw.
  adapter.getNativeStorage = function() { throw new Error('Nope.'); };
  adapter.on('persistenceUnavailable', handler);

  var person = run(store, 'createRecord', 'person', { id: 'tom', name: 'Tom' });
  assert.notOk(calledGetnativeStorage, 'Should not trigger `persistenceUnavailable` until actually trying to persist');

  run(person, 'save').then(() => {
    assert.ok(calledGetnativeStorage, 'Saving a record without local storage should trigger `persistenceUnavailable`');
    store.unloadRecord(person);
    return store.findRecord('person', 'tom');
  }).then((reloadedPerson) => {
    assert.equal(get(reloadedPerson, 'name'), 'Tom', 'Records should still persist in-memory without local storage');
    done();
  });
});
