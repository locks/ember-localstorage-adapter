// global variables
var get = Ember.get,
    App = {};

var store;

function stringify(string){
  return function(){ return string };
}

module('DS.LSAdapter', {
  setup: function() {
    localStorage.setItem('DS.LSAdapter', JSON.stringify(FIXTURES));
    var env = {};

    App.List = DS.Model.extend({
      name: DS.attr('string'),
      b: DS.attr('boolean'),
      items: DS.hasMany('item')
    });

    App.Item = DS.Model.extend({
      name: DS.attr('string'),
      list: DS.belongsTo('list')
    });

    App.Order = DS.Model.extend({
      name: DS.attr('string'),
      b: DS.attr('boolean'),
      hours: DS.hasMany('hour')
    });

    App.Hour = DS.Model.extend({
      name: DS.attr('string'),
      amount: DS.attr('number'),
      order: DS.belongsTo('order')
    });

    App.Person = DS.Model.extend({
      name: DS.attr('string'),
      birthdate: DS.attr('date')
    });

    env = setupStore({
      list: App.List,
      item: App.Item,
      order: App.Order,
      hour: App.Hour,
      person: App.Person,
      adapter: DS.LSAdapter
    });
    store = env.store;
  }
});

test('existence', function() {
  ok(DS.LSAdapter, 'LSAdapter added to DS namespace');
  ok(DS.LSSerializer, 'LSSerializer added to DS namespace');
});

test('find with id', function() {
  expect(3);

  stop();
  store.find('list', 'l1').then(function(list) {
    equal(get(list, 'id'),   'l1',  'id is loaded correctly');
    equal(get(list, 'name'), 'one', 'name is loaded correctly');
    equal(get(list, 'b'),    true,  'b is loaded correctly');
    start();
  });
});

test('#find - rejects promise when non-existing record', function () {
  expect(1);

  stop();
  store.find("list", "unknown").catch(function () {
    ok(true);
    start();
  });
});

test('findQuery', function() {

  stop();
  store.findQuery('list', {name: /one|two/}).then(function(records) {
    equal(get(records, 'length'), 2, 'found results for /one|two/');
    start();
  });

  stop();
  store.findQuery('list', {name: /.+/, id: /l1/}).then(function(records) {
    equal(get(records, 'length'), 1, 'found results for {name: /.+/, id: /l1/}');
    start();
  });

  stop();
  store.findQuery('list', {name: 'one'}).then(function(records) {
    equal(get(records, 'length'), 1, 'found results for name "one"');
    start();
  });

  stop();
  store.findQuery('list', {b: true}).then(function(records) {
    equal(get(records, 'length'), 1, 'found results for {b: true}');
    start();
  });
});

test('#findQuery - rejects promise when there are no records', function() {
  stop();
  store.findQuery('list', {name: /unknown/}).catch(function() {
    ok(true);
    equal(store.hasRecordForId("list", "unknown"), false);
    start();
  });
});

test('findAll', function() {
  expect(4);

  stop();
  store.findAll('list').then(function(records) {
    var firstRecord  = records.objectAt(0),
        secondRecord = records.objectAt(1),
        thirdRecord  = records.objectAt(2);

    equal(get(records, 'length'), 3, "3 items were found");

    equal(get(firstRecord,  'name'), "one", "First item's name is one");
    equal(get(secondRecord, 'name'), "two", "Second item's name is two");
    equal(get(thirdRecord,  'name'), "three", "Third item's name is three");

    start();
  });
});

test('findQueryMany', function() {
  expect(11);
  stop();
  store.find('order', { b: true }).then(function(records) {
    var firstRecord = records.objectAt(0),
        secondRecord = records.objectAt(1),
        thirdRecord = records.objectAt(2);

    equal(get(records, 'length'), 3, "3 orders were found");
    equal(get(firstRecord, 'name'), "one", "First order's name is one");
    equal(get(secondRecord, 'name'), "three", "Second order's name is three");
    equal(get(thirdRecord, 'name'), "four", "Third order's name is four");
    var firstHours = firstRecord.get('hours'),
        secondHours = secondRecord.get('hours'),
        thirdHours = thirdRecord.get('hours');

    equal(get(firstHours, 'length'), 2, "Order one has two hours");
    equal(get(secondHours, 'length'), 2, "Order three has two hours");
    equal(get(thirdHours, 'length'), 0, "Order four has no hours");

    var hourOne = firstHours.objectAt(0),
        hourTwo = firstHours.objectAt(1),
        hourThree = secondHours.objectAt(0),
        hourFour = secondHours.objectAt(1);
    equal(get(hourOne, 'amount'), 4, "Hour one has amount of 4");
    equal(get(hourTwo, 'amount'), 3, "Hour two has amount of 3");
    equal(get(hourThree, 'amount'), 2, "Hour three has amount of 2");
    equal(get(hourFour, 'amount'), 1, "Hour four has amount of 1");

    start();
  });
});

test('createRecord', function() {
  expect(5);
  stop();
  list = store.createRecord('list', { name: 'Rambo' });

  list.save().then(function() {
    store.findQuery('list', { name: 'Rambo' }).then(function(records) {
      var record = records.objectAt(0);

      equal(get(records, 'length'), 1, "Only Rambo was found");
      equal(get(record,  'name'),  "Rambo", "Correct name");
      equal(get(record,  'id'),    list.id, "Correct, original id");
    });

    list.save().then(function() {
      store.find('list', list.id).then(function(record) {
        equal(get(record,  'name'),  "Rambo", "Correct name");
        equal(get(record,  'id'),    list.id, "Correct, original id");

        start();
      });
    });
  });
});

test('updateRecords', function() {
  expect(3);
  stop();
  list = store.createRecord('list', { name: 'Rambo' });

  var UpdateList = function(list) {
    return store.findQuery('list', { name: 'Rambo' }).then(function(records) {
      var record = records.objectAt(0);
      record.set('name', 'Macgyver');
      return record.save();
    });
  }

  var AssertListIsUpdated = function() {
    return store.findQuery('list', { name: 'Macgyver' }).then(function(records) {
      var record = records.objectAt(0);

      equal(get(records, 'length'), 1,         "Only one record was found");
      equal(get(record,  'name'),  "Macgyver", "Updated name shows up");
      equal(get(record,  'id'),    list.id,    "Correct, original id");

      start();
    });
  }

  list.save().then(UpdateList)
             .then(AssertListIsUpdated);
});

test('deleteRecord', function() {
  expect(2);
  stop();
  var AssertListIsDeleted = function() {
    return store.findQuery('list', { name: 'one' }).catch(function() {
      ok(true, "List was deleted");
      start();
    });
  }

  store.findQuery('list', { name: 'one' }).then(function(lists) {
    var list = lists.objectAt(0);

    equal(get(list, "id"), "l1", "Item exists");

    list.deleteRecord();
    list.on("didDelete", AssertListIsDeleted);
    list.save();
  });
});

test('changes in bulk', function() {
  stop();
  var promises,
      listToUpdate = store.find('list', 'l1'),
      listToDelete = store.find('list', 'l2'),
      listToCreate = store.createRecord('list', { name: 'Rambo' });

  var UpdateList = function(list) {
    list.set('name', 'updated');
    return list;
  }
  var DeleteList = function(list) {
    list.deleteRecord();
    return list;
  }

  promises = [
    listToCreate,
    listToUpdate.then(UpdateList),
    listToDelete.then(DeleteList),
  ];

  Ember.RSVP.all(promises).then(function(lists) {
    promises = Ember.A();

    lists.forEach(function(list) {
      promises.push(list.save());
    });

    return promises;
  }).then(function() {
    var updatedList = store.find('list', 'l1'),
        createdList = store.findQuery('list', {name: 'Rambo'}),
        promises    = Ember.A();

    createdList.then(function(lists) {
      equal(get(lists, 'length'), 1, "Record was created successfully");
      promises.push(new Ember.RSVP.Promise(function(){}));
    });

    store.find('list', 'l2').then(function(list) {
      equal(get(list, 'length'), undefined, "Record was deleted successfully");
      promises.push(new Ember.RSVP.Promise(function(){}));
    });

    updatedList.then(function(list) {
      equal(get(list, 'name'), 'updated', "Record was updated successfully");
      promises.push(new Ember.RSVP.Promise(function(){}));
    });

    Ember.RSVP.all(promises).then(function() {
      start();
    });
  });


  // assertState('deleted', true, listToDelete);
  // assertListNotFoundInStorage(listToDelete);
  // assertStoredList(updatedList);
  // assertStoredList(newList);
});

test('load hasMany association', function() {
  expect(4);
  stop();

  store.find('list', 'l1').then(function(list) {
    var items = list.get('items');

    var item1 = items.get('firstObject'),
        item2 = items.get('lastObject');

    equal(get(item1, 'id'),   'i1',  'first item id is loaded correctly');
    equal(get(item1, 'name'), 'one', 'first item name is loaded correctly');
    equal(get(item2, 'id'),   'i2',  'first item id is loaded correctly');
    equal(get(item2, 'name'), 'two', 'first item name is loaded correctly');

    start();
  });
});

test('load belongsTo association', function() {
  stop();

  store.find('item', 'i1').then(function(item) {
    return new Ember.RSVP.Promise(function(resolve) { resolve(get(item, 'list')); });
  }).then(function(list) {
    equal(get(list, 'id'), 'l1', "id is loaded correctly");
    equal(get(list, 'name'), 'one', "name is loaded correctly");

    start();
  });
});

test('saves belongsTo', function() {
  var item,
      listId = 'l2';

  stop();

  store.find('list', listId).then(function(list) {
    item = store.createRecord('item', { name: 'three thousand' });
    item.set('list', list);

    return item.save();
  }).then(function(item) {
    store.unloadAll('item');
    return store.find('item', item.get('id'));
  }).then(function(item) {
    var list = item.get('list');
    ok(item.get('list'), 'list is present');
    equal(list.id, listId, 'list is retrieved correctly');
    start();
  });
});

test('saves hasMany', function() {
  var item, list,
      listId = 'l2';

  stop();

  store.find('list', listId).then(function(list) {
    item = store.createRecord('item', { name: 'three thousand' });
    list.get('items').pushObject(item);

    return list.save();
  }).then(function(list) {
    return item.save();
  }).then(function(item) {
    store.unloadAll('list');
    return store.find('list', listId);
  }).then(function(list) {
    var items = list.get('items'),
        item1 = items.objectAt(0);

    equal(item1.get('name'), 'three thousand', 'item is saved');
    start();
  });
});

test("serializeHasMany respects keyForRelationship", function() {
  store.get('container').register('serializer:list', DS.LSSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));

  list = store.createRecord('list', { name: "Rails is omakase", id: "1"});
  comment = store.createRecord('item', { name: "Omakase is delicious", list: list, id: "1"});
  var json = {};
  var snapshot = list._createSnapshot();

  store.get('container').lookup("serializer:list").serializeHasMany(snapshot, json, {key: "items", options: {}});

  deepEqual(json, {
    ITEMS: ["1"]
  });

  store.get('container').unregister('serializer:list')
});

test("extractArray calls extractSingle", function() {
  var callback = sinon.stub();

  store.get('container').register('serializer:list', DS.LSSerializer.extend({
    extractSingle: function(store, type, payload) {
      callback();
      return this.normalize(type, payload);
    }
  }));

  expect(1);
  stop();

  store.find('list').then(function(lists) {
    equal(callback.callCount, 3);
    
    start();
  });

  store.get('container').unregister('serializer:list')
});

test('date is loaded correctly', function() {
  expect(2);
  stop();

  var date = new Date(1988, 11, 28);
  
  var person = store.createRecord('person', { name: 'Tom', birthdate: date });
  person.save().then(function() {
    store.find('person', { name: 'Tom' }).then(function(records) {
      var loadedPerson = records.get('firstObject');
      var birthdate = get(loadedPerson, 'birthdate');
      ok((birthdate instanceof Date), 'Date should be loaded as an instance of Date');
      equal(birthdate.getTime(), date.getTime(), 'Date content should be loaded correctly');
      start();
    });
  });
})

// This crashes chrome.
// TODO: Figure out a way to test this without using so much memory.
//
// test('QUOTA_EXCEEDED_ERR when storage is full', function() {
//   occupyLocalStorage();
//   var handler = sinon.spy();
//   adapter.on('QUOTA_EXCEEDED_ERR', handler);
//
//   list = List.createRecord({name: n100k});
//
//   assertState('new');
//   store.commit();
//   assertState('saving');
//
//   clock.tick(1);
//
//   assertState('saving', false);
//   assertState('error');
//   equal(handler.getCall(0).args[0].list[0], list,
//         'error handler called with record not saved');
//
//   // clean up
//   localStorage.removeItem('junk');
// });

