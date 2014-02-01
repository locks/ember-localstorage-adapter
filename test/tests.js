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

    App.List.toString = stringify('App.List');

    App.Item = DS.Model.extend({
      name: DS.attr('string'),
      list: DS.belongsTo('list')
    });

    App.Item.toString = stringify('App.Item');

    env = setupStore({
      list: App.List,
      item: App.Item,
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

  stop();
  store.findQuery('list', {whatever: "dude"}).then(function(records) {
    equal(get(records, 'length'), 0, 'didn\'t find results for nonsense');
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
    return store.findQuery('list', { name: 'one' }).then(function(records) {
      equal(get(records, 'length'), 0, "No record was found");
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
      promises.push(Ember.RSVP.Promise());
    });

    store.find('list', 'l2').then(function(list) {
      equal(get(list, 'length'), undefined, "Record was deleted successfully");
      promises.push(Ember.RSVP.Promise());
    });

    updatedList.then(function(list) {
      equal(get(list, 'name'), 'updated', "Record was updated successfully");
      promises.push(Ember.RSVP.Promise());
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
    return Ember.RSVP.Promise(function(resolve) { resolve(get(item, 'list')); });
  }).then(function(list) {
    equal(get(list, 'id'), 'l1', "id is loaded correctly");
    equal(get(list, 'name'), 'one', "name is loaded correctly");

    start();
  });
});

test('saves belongsTo', function() {
  stop();
  var listId = 'l2';

  store.find('list', listId).then(function(list) {
    // create and store a new item
    itemParams = { name: 'three', list: list };
    item = store.createRecord('item', itemParams);

    // When the list is saved (async)
    return item.save();
  }).then(function(item) {
    // reload the item
    return store.find('item', get(item, 'id'));
  }).then(function(item) {
    // follow the association
    return get(item, 'list')
  }).then(function(list) {
    equal(get(list, 'id'), listId, 'list is retrieved correctly');
    start();
  });
});

test('saves hasMany', function() {
});

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

