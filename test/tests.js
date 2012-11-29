module('DS.LSAdapter', {

  setup: function() {
    localStorage.setItem('DS.LSAdapter', JSON.stringify(FIXTURES));

    List = DS.Model.extend({
      name: DS.attr('string'),
      b: DS.attr('boolean'),
      lol: DS.attr('string')
    });

    List.toString = function() {
      return 'App.List';
    };

    adapter = DS.LSAdapter.create();

    store = DS.Store.create({adapter: adapter});

    clock = sinon.useFakeTimers();
  },

  teardown: function() {
    clock.restore();
    localStorage.removeItem('DS.LSAdapter');
    adapter.destroy();
    store.destroy();
    list = null;
    lists = null;
  }

});

Ember.ENV.TESTING = true;

// global variables
var List, store, adapter, clock, list, lists;

var FIXTURES = {
  'App.List': {
    last_id: 3,
    records: {
      1: { id: 1, name: 'one', b: true, lol: '' },
      2: { id: 2, name: 'two', b: false, lol: ''},
      3: { id: 3, name: 'three', b: false, lol: '' }
    }
  }
};

// helpers
function assertName(l, id) {
  l = l || list;
  id = id || 1;
  equal(l.get('name'), FIXTURES['App.List'].records[id].name);
}

function commit() {
  store.commit();
  clock.tick(1);
}

function createNewList(name) {
  return List.createRecord({ name: name || 'new' });
}

function createAndSaveNewList(name) {
  list = createNewList(name);
  commit();
  storedLists = getStoredLists();
  equal(storedLists[list.get('id')].name, list.get('name'), 'list saved');
}

function getStoredLists() {
  var json = localStorage.getItem('DS.LSAdapter');
  var obj = JSON.parse(json);
  return obj['App.List'].records;
}

function expectState(state, value, l) {
  l = l || list;

  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(l.get(flag), value, "the list is " + (value === false ? "not " : "") + state);
}

function repeat(str, n) {
  var a = [];
  while (n--) a.push(str);
  return a.join('');
}

var n10b  = '0123456789';
var n100b = repeat(n10b, 10);
var n1k   = repeat(n100b, 10);
var n10k  = repeat(n1k, 10);
var n100k = repeat(n10k, 10);

// WE ARE THE 99%!!
function occupyLocalStorage() {

  var item = n100k;

  var saveUntilFull = function() {
    item = item + n100k;

    try {
      localStorage.setItem('junk', item);
    } catch(error) {
      if (error.name === 'QUOTA_EXCEEDED_ERR') {
        return false;
      }
    }

    return true;
  };

  while (saveUntilFull()) { continue; }
}

test('existence', function() {
  ok(DS.LSAdapter, 'LSAdapter added to DS namespace');
});

test('find', function() {
  list = List.find(1);
  clock.tick(1);
  assertName();
});

test('findMany', function() {
  lists = store.findMany(List, [1,3]);
  clock.tick(1);
  assertName(lists.objectAt(0), 1);
  assertName(lists.objectAt(1), 3);
});

test('findQuery', function() {
  var assertFirstObjectFound = function() {
    clock.tick(1);
    equal(lists.get('length'), 1);
    assertName(lists.objectAt(0), 1);
  };

  lists = store.findQuery(List, {name: /one|two/});
  clock.tick(1);
  equal(lists.get('length'), 2);
  assertName(lists.objectAt(0), 1);
  assertName(lists.objectAt(1), 2);

  lists = store.findQuery(List, {name: /.+/, id: /1/});
  assertFirstObjectFound();

  lists = store.findQuery(List, {name: 'one'});
  assertFirstObjectFound();

  lists = store.findQuery(List, {b: true});
  assertFirstObjectFound();
});

test('findAll', function() {
  lists = store.findAll(List);
  clock.tick(1);
  assertName(lists.objectAt(0), 1);
  assertName(lists.objectAt(1), 2);
  assertName(lists.objectAt(2), 3);
});

test('createRecords', function() {
  createAndSaveNewList();
  equal(list.get('id'), 4, 'id is incremented for new records');
});

test('updateRecords', function() {
  createAndSaveNewList();
  list.set('name', 'updated');
  commit();
  var storedList = getStoredLists()[list.get('id')];
  equal(list.get('name'), 'updated');
  equal(storedList.name, list.get('name'));
});

test('deleteRecords', function() {
  createAndSaveNewList();
  list.deleteRecord();
  equal(list.get('isDeleted'), true);
  commit();
  equal(list.get('isDeleted'), true);
  var storedLists = getStoredLists();
  equal(storedLists[list.get('id')], undefined);
});

test('bulkCommits changes', function() {
  var listToUpdate = List.find(1);
  var listToDelete = List.find(2);
  createNewList('bulk new');
  clock.tick(1);

  listToUpdate.set('name', 'updated');
  listToDelete.deleteRecord();
  commit();

  var updatedList = List.find(1);
  var newList = List.find(4);
  clock.tick(1);

  ok(listToDelete.get('isDeleted'), 'list deleted');
  equal(updatedList.get('name'), 'updated', 'list updated');
  equal(newList.get('name'), 'bulk new', 'created new list');
});

test('QUOTA_EXCEEDED_ERR when storage is full', function() {
  occupyLocalStorage();
  var handler = sinon.spy();
  adapter.on('QUOTA_EXCEEDED_ERR', handler);

  list = List.createRecord({name: n100k});

  expectState('new');
  store.commit();
  expectState('saving');

  clock.tick(1);

  expectState('saving', false);
  expectState('error');
  equal(handler.getCall(0).args[0].list[0], list,
        'error handler called with record not saved');

  // clean up
  localStorage.removeItem('junk');

   // // get the record back in a state where it will be committed
   //list.get('stateManager').transitionTo('loaded.created');
   
   //commit();
   
   //expectState('saving', false);
   //expectState('error', false);
   //lists = getStoredLists();
   //ok(lists[4], 'list saved after first error');
});


