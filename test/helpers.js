Ember.ENV.TESTING = true;

var FIXTURES = {
  'App.List': {
    records: {
      'l1': { id: 'l1', name: 'one', b: true, items: ['i1', 'i2'] },
      'l2': { id: 'l2', name: 'two', b: false, items: [] },
      'l3': { id: 'l3', name: 'three', b: false, items: [] }
    }
  },

  'App.Item': {
    records: {
      'i1': { id: 'i1', name: 'one', list: 'l1' },
      'i2': { id: 'i2', name: 'two', list: 'l1' }
    }
  }
};

var setupStore = function(options) {
  var env = {};
  options = options || {};

  var container = env.container = new Ember.Container();

  var adapter = env.adapter = (options.adapter || DS.Adapter);
  delete options.adapter;

  for (var prop in options) {
    container.register('model:' + prop, options[prop]);
  }

  container.register('store:main', DS.Store.extend({
    adapter: adapter
  }));

  container.register('serializer:_default', DS.JSONSerializer);
  container.register('serializer:_rest', DS.RESTSerializer);
  container.register('adapter:_rest', DS.RESTAdapter);

  container.injection('serializer', 'store', 'store:main');

  env.serializer = container.lookup('serializer:_default');
  env.restSerializer = container.lookup('serializer:_rest');
  env.store = container.lookup('store:main');
  env.adapter = env.store.get('defaultAdapter');

  return env;
};

var transforms = {
  'boolean': DS.BooleanTransform.create(),
  'date': DS.DateTransform.create(),
  'number': DS.NumberTransform.create(),
  'string': DS.StringTransform.create()
};

// Prevent all tests involving serialization to require a container
DS.JSONSerializer.reopen({
  transformFor: function(attributeType) {
    return this._super(attributeType, true) || transforms[attributeType];
  }
});

function assertStoredList(l) {
  var storedList;

  l = l || list;
  stop();
  l.then(function(l){
    var storedList = getStoredList(l.get('id'));

    console.log("1");
    //console.log(l.serialize({includeId: true}));
    //console.log(l.get('items'));
    console.log("2");
    //console.log(storedList);
    //deepEqual(storedList, l,
              //'list data matches stored list');
    start();
    console.log("3");
  });
}

function assertStoredLists(ls) {
  (ls || lists).forEach(assertStoredList);
}

function assertStoredItem(i) {
  i = i || item;
  var storedItem = getStoredItem(i.get('id'));
  deepEqual(storedItem, i.serialize({includeId: true}),
            'item data matches stored list');
}

function assertStoredItems(is) {
  (is || items).forEach(assertStoredItem);
}

function assertListsLength(expectedLength) {
  equal(lists.get('length'), expectedLength,
        'found ' + expectedLength + ' result(s)');
}

function assertQuery(expectedLength) {
  assertListsLength(expectedLength || 1);
  assertStoredLists();
}

function assertItemBelongsToList(item, list) {
  var storedItem = getStoredItem(item.get('id'));
  equal(item.get('list'), list, 'items list is the list');
  equal(storedItem.list, list.get('id'), 'stored item list matches list id');
}

function assertListHasItem(list, item) {
  var storedList = getStoredList(list.get('id'));
  ok(storedList.items, 'list.items set');
  var index = Ember.EnumerableUtils.indexOf(storedList.items, item.get('id'));
  ok(index > -1, 'item id found in list.items');
}

function assertState(state, value, l) {
  l = l || list;
  if (value === undefined) { value = true; }
  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
  equal(l.get(flag), value,
        "the list is " + (value === false ? "not " : "") + state);
}

function assertListNotFoundInStorage(l) {
  l = l || list;
  var storedLists = getStoredLists();

  equal(storedLists[l.get('id')], undefined,
        'list not found in local storage');
}

function commit() {
  store.commit();
  clock.tick(1);
}

function createList() {
  list = List.createRecord({ name: 'Rambo' });
  commit();
  assertStoredList();
}

function getLocalStorage() {
  var json = localStorage.getItem('DS.LSAdapter');
  return JSON.parse(json);
}

function getStoredRecords(ns) {
  return getLocalStorage()['App.' + ns].records;
}

function getStoredLists() {
  return getStoredRecords('List');
}

function getStoredItems() {
  return getStoredRecords('Item');
}

function getStoredItem(id) {
  return getStoredItems()[id];
}

function getStoredList(id) {
  return getStoredLists()[id];
}

// stuff to fill up local storage
var n100k = (function() {
  function repeat(str, n) {
    var a = [];
    while (n--) a.push(str);
    return a.join('');
  }

  var n10b  = '0123456789';
  var n100b = repeat(n10b, 10);
  var n1k   = repeat(n100b, 10);
  var n10k  = repeat(n1k, 10);
  return repeat(n10k, 10);
})();

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

