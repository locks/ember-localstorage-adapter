// global variables
var List, list, lists,
    Item, item, items,
    store, adapter, clock;

module('DS.LSAdapter', {

  setup: function() {
    localStorage.setItem('DS.LSAdapter', JSON.stringify(FIXTURES));

    List = DS.Model.extend({
      name: DS.attr('string'),
      b: DS.attr('boolean')
    });

    List.toString = function() {
      return 'App.List';
    };

    Item = DS.Model.extend({
      name: DS.attr('string')
    });

    Item.toString = function() {
      return 'App.Item';
    };

    List.reopen({
      items: DS.hasMany(Item)
    });

    Item.reopen({
      list: DS.belongsTo(List)
    });

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

test('existence', function() {
  ok(DS.LSAdapter, 'LSAdapter added to DS namespace');
});

test('find', function() {
  list = List.find(1);
  clock.tick(1);
  assertStoredList();
});

test('findMany', function() {
  lists = store.findMany(List, [1,3]);
  clock.tick(1);
  assertStoredLists();
});

test('findQuery', function() {
  lists = store.findQuery(List, {name: /one|two/});
  assertQuery(2);

  lists = store.findQuery(List, {name: /.+/, id: /1/});
  assertQuery();

  lists = store.findQuery(List, {name: 'one'});
  assertQuery();

  lists = store.findQuery(List, {b: true});
  assertQuery();
});

test('findAll', function() {
  lists = store.findAll(List);
  clock.tick(1);
  assertListsLength(3);
  assertStoredLists();
});

test('createRecords', function() {
  createAndSaveNewList();
});

test('updateRecords', function() {
  createAndSaveNewList();
  list.set('name', 'updated');
  commit();
  assertStoredList();
});

test('deleteRecords', function() {
  createAndSaveNewList();

  list.deleteRecord();
  assertState('deleted');

  commit();

  assertState('deleted');
  assertListNotFoundInStorage();

  lists = store.findAll(List);
  clock.tick(1);

  assertListsLength(3);
});

test('bulkCommits changes', function() {
  var listToUpdate = List.find(1);
  var listToDelete = List.find(2);
  List.createRecord({name: 'bulk new'}); // will find later

  clock.tick(1);

  listToUpdate.set('name', 'updated');
  listToDelete.deleteRecord();

  commit();

  var updatedList = List.find(1);
  var newList = List.find(4);
  clock.tick(1);

  assertState('deleted', true, listToDelete);
  assertListNotFoundInStorage(listToDelete);
  assertStoredList(updatedList);
  assertStoredList(newList);
});

test('load hasMany association', function() {
  list = List.find(1);
  clock.tick(1);

  assertStoredList();

  items = list.get('items');
  clock.tick(1);

  assertStoredItems();
});

test('load belongsTo association', function() {
  item = Item.find(1);
  clock.tick(1);
  list = item.get('list');
  clock.tick(1);

  assertStoredList();
});

test('saves belongsTo and hasMany associations', function() {
  list = List.find(1);
  clock.tick(1);
  item = Item.createRecord({name: '3', list: list});
  commit();

  assertItemBelongsToList(item, list);
  assertListHasItem(list, item);
});

test('QUOTA_EXCEEDED_ERR when storage is full', function() {
  occupyLocalStorage();
  var handler = sinon.spy();
  adapter.on('QUOTA_EXCEEDED_ERR', handler);

  list = List.createRecord({name: n100k});

  assertState('new');
  store.commit();
  assertState('saving');

  clock.tick(1);

  assertState('saving', false);
  assertState('error');
  equal(handler.getCall(0).args[0].list[0], list,
        'error handler called with record not saved');

  // clean up
  localStorage.removeItem('junk');

   // // get the record back in a state where it will be committed
   //list.get('stateManager').transitionTo('loaded.created');
   
   //commit();
   
   //assertState('saving', false);
   //assertState('error', false);
   //lists = getStoredLists();
   //ok(lists[4], 'list saved after first error');
});

