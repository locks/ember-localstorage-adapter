Ember.ENV.TESTING = true;

var FIXTURES = {
  'App.List': {
    last_id: 3,
    records: {
      1: { id: 1, name: 'one', b: true, items: [1, 2] },
      2: { id: 2, name: 'two', b: false, items: [] },
      3: { id: 3, name: 'three', b: false, items: [] }
    }
  },

  'App.Item': {
    last_id: 2,
    records: {
      1: { id: 1, name: 'one', list: 1 },
      2: { id: 2, name: 'two', list: 1 }
    }
  }
};

function assertStoredList(l) {
  l = l || list;
  var storedList = getStoredList(l.get('id'));
  deepEqual(storedList, l.toData({includeId: true}), 'list data matches stored list');
}

function assertStoredLists(ls) {
  (ls || lists).forEach(assertStoredList);
}

function assertStoredItem(i) {
  i = i || item;
  var storedItem = getStoredItem(i.get('id'));
  deepEqual(storedItem, i.toData({includeId: true}), 'item data matches stored list');
}

function assertStoredItems(is) {
  (is || items).forEach(assertStoredItem);
}

function assertListsLength(expectedLength) {
  equal(lists.get('length'), expectedLength,
        'found ' + expectedLength + ' result(s)');
}

function assertQuery(expectedLength) {
  clock.tick(1);
  assertListsLength(expectedLength || 1);
  assertStoredLists();
}

function assertItemMatchesStorage(item) {
  var id = item.get('id');
  var storedItem = getStoredItem(id);
  equal(item.get('name'), storedItem.name);
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
  equal(l.get(flag), value, "the list is " + (value === false ? "not " : "") + state);
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

function createAndSaveNewList(name) {
  list = List.createRecord({ name: name || 'new' });
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

