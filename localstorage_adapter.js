/*global Ember*/
/*global DS*/
'use strict';

DS.LSAdapter = DS.Adapter.extend(Ember.Evented, {
  /**
    This is the main entry point into finding records. The first parameter to
    this method is the model's name as a string.

    @method find
    @param {DS.Model} type
    @param {Object|String|Integer|null} id
    */
  find: function (store, type, id) {
    var namespace = this._namespaceForType(type),
    record = Ember.A(namespace.records[id]);

    return Ember.RSVP.resolve(record);
  },

  findMany: function (store, type, ids) {
    var namespace = this._namespaceForType(type),
        results = [];

    for (var i = 0; i < ids.length; i++) {
      results.push(Ember.copy(namespace.records[ids[i]]));
    }
    return Ember.RSVP.resolve(results);
  },

  // Supports queries that look like this:
  //
  //   {
  //     <property to query>: <value or regex (for strings) to match>,
  //     ...
  //   }
  //
  // Every property added to the query is an "AND" query, not "OR"
  //
  // Example:
  //
  //  match records with "complete: true" and the name "foo" or "bar"
  //
  //    { complete: true, name: /foo|bar/ }
  findQuery: function (store, type, query, recordArray) {
    var namespace = this._namespaceForType(type),
        results = this.query(namespace.records, query);

    return Ember.RSVP.resolve(results);
  },

  query: function (records, query) {
    var results = [],
        id, record, property, test, push;
    for (id in records) {
      record = records[id];
      for (property in query) {
        test = query[property];
        push = false;
        if (Object.prototype.toString.call(test) === '[object RegExp]') {
          push = test.test(record[property]);
        } else {
          push = record[property] === test;
        }
      }
      if (push) {
        results.push(record);
      }
    }
    return results;
  },

  findAll: function (store, type) {
    var namespace = this._namespaceForType(type),
        results = [];
    for (var id in namespace.records) {
      results.push(Ember.copy(namespace.records[id]));
    }
    return Ember.RSVP.resolve(results);
  },

  createRecord: function (store, type, record) {
    var namespaceRecords = this._namespaceForType(type),
        recordHash = record.serialize({includeId: true});

    namespaceRecords.records[recordHash.id] = recordHash;

    this.persistData(type, namespaceRecords);
    return Ember.RSVP.resolve(record);
  },

  updateRecord: function (store, type, record) {
    var namespaceRecords = this._namespaceForType(type),
        id = record.get('id');

    namespaceRecords.records[id] = record.toJSON({ includeId: true });

    this.persistData(type, namespaceRecords);
    return Ember.RSVP.resolve();
  },

  deleteRecord: function (store, type, record) {
    var namespaceRecords = this._namespaceForType(type),
        id = record.get('id');

    delete namespaceRecords.records[id];

    this.persistData(type, namespaceRecords);
    return Ember.RSVP.resolve();
  },

  generateIdForRecord: function () {
    return Math.random().toString(32).slice(2).substr(0, 5);
  },

  // private

  adapterNamespace: function () {
    return this.namespace || 'DS.LSAdapter';
  },

  loadData: function () {
    return JSON.parse(localStorage.getItem(this.adapterNamespace()));
  },

  persistData: function(type, data) {
    var modelNamespace = this.modelNamespace(type),
        localStorageData = this.loadData();

    localStorageData[modelNamespace] = data;

    localStorage.setItem(this.adapterNamespace(), JSON.stringify(localStorageData));
  },

  _namespaceForType: function (type) {
    var namespace = this.modelNamespace(type),
        storage   = localStorage.getItem(this.adapterNamespace());

    return JSON.parse(storage)[namespace] || {records: {}};
  },

  modelNamespace: function(type) {
    return type.url || type.toString();
  }
});
