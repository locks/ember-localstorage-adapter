// global variables
var List, list, lists,
    Item, item, items,
    store, adapter, clock, container;

function stringify(string){
  return function(){ return string };
}

module('DS.LSAdapter', {

  setup: function() {
    localStorage.setItem('DS.LSAdapter', JSON.stringify(FIXTURES));
    var env = {};

    List = DS.Model.extend({
      name: DS.attr('string'),
      b: DS.attr('boolean'),
      items: DS.hasMany('item')
    });

    List.toString = stringify('App.List');

    Item = DS.Model.extend({
      name: DS.attr('string'),
      list: DS.belongsTo('list')
    });

    Item.toString = stringify('App.Item');

    container = env.container = new Ember.Container();

    adapter = DS.LSAdapter.create({
      container: container
    });

    container.register('store:main', DS.Store.extend({
      adapter: adapter
    }));

    container.register('model:list', List);
    container.register('model:item', Item);

    container.register('serializer:_default', DS.JSONSerializer);

    container.injection('serializer', 'store', 'store:main');

    store = env.store = container.lookup('store:main');
    env.serializer = container.lookup('serializer:_default');
    env.lsSerializer = container.lookup('serializer:_default');
    env.adapter = env.store.get('_adapter');

  },

  teardown: function() {

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

asyncTest('find', function() {
  store.findAll('item');
  list = store.find('list', 'l1');
  console.log(list);
  assertStoredList(list);
});

test('findMany', function() {
  lists = store.findMany(List, ['l1', 'l3']);
  clock.tick(1);
  assertStoredLists();
});

test('findQuery', function() {
  lists = store.findQuery(List, {name: /one|two/});
  assertQuery(2);

  lists = store.findQuery(List, {name: /.+/, id: /l1/});
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
  var listToUpdate = List.find('l1');
  var listToDelete = List.find('l2');
  List.createRecord({name: 'bulk new'}); // will find later

  clock.tick(1);

  listToUpdate.set('name', 'updated');
  listToDelete.deleteRecord();

  commit();

  var updatedList = List.find('l1');
  var newListQuery = store.findQuery(List, {name: 'bulk new'});
  clock.tick(1);
  var newList = newListQuery.objectAt(0);

  assertState('deleted', true, listToDelete);
  assertListNotFoundInStorage(listToDelete);
  assertStoredList(updatedList);
  assertStoredList(newList);
});

test('load hasMany association', function() {
  list = List.find('l1');
  clock.tick(1);

  assertStoredList();

  items = list.get('items');
  clock.tick(1);

  assertStoredItems();
});

test('load belongsTo association', function() {
  item = Item.find('i1');
  clock.tick(1);
  list = item.get('list');
  clock.tick(1);

  assertStoredList();
});

test('saves belongsTo and hasMany associations', function() {
  list = List.find('l1');
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
});

