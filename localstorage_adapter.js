DS.LSSerializer = DS.Serializer.extend({

  addBelongsTo: function(data, record, key, association) {
    data[key] = parseInt(record.get(key + '.id'), 10);
  },

  addHasMany: function(data, record, key, association) {
    data[key] = record.get(key).map(function(record) {
      return parseInt(record.get('id'), 10);
    });
  }

});

DS.LSAdapter = DS.Adapter.extend(Ember.Evented, {

  init: function() {
    this._loadData();
  },

  serializer: DS.LSSerializer.create(),

  find: function(store, type, id) {
    var namespace = this._namespaceForType(type);
    this._async(function(){
      store.load(type, id, Ember.copy(namespace.records[id]));
    });
  },

  findMany: function(store, type, ids) {
    var namespace = this._namespaceForType(type);
    this._async(function(){
      var results = [];
      for (var i = 0; i < ids.length; i++) {
        results.push(Ember.copy(namespace.records[ids[i]]));
      }
      store.loadMany(type, results);
    });
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
  findQuery: function(store, type, query, recordArray) {
    var namespace = this._namespaceForType(type);
    this._async(function() {
      var results = [];
      // grossness to follow, miss coffeescript ...
      // (also realize this is my fault not JavaScript's)
      var id, record, property, test, push;
      for (id in namespace.records) {
        record = namespace.records[id];
        for (property in query) {
          test = query[property];
          push = false;
          if (Object.prototype.toString.call(test) == '[object RegExp]') {
            push = test.test(record[property]);
          } else {
            push = record[property] === test;
          }
        }
        if (push) {
          results.push(record);
        }
      }
      recordArray.load(results);
    });
  },

  findAll: function(store, type) {
    var namespace = this._namespaceForType(type);
    this._async(function() {
      var results = [];
      for (var id in namespace.records) {
        results.push(Ember.copy(namespace.records[id]));
      }
      store.loadMany(type, results);
    });
  },

  createRecords: function(store, type, records) {
    var namespace = this._namespaceForType(type);
    this._async(function() {
      var data = [];
      records.forEach(function(record) {
        this._addRecordToNamespace(namespace, record);
      }, this);
      this._didSaveRecords(store, type, records);
    });
  },

  updateRecords: function(store, type, records) {
    var namespace = this._namespaceForType(type);
    this._async(function() {
      records.forEach(function(record) {
        var id = record.get('id');
        namespace.records[id] = record.toData({includeId:true});
      }, this);
      this._didSaveRecords(store, type, records);
    });
  },

  deleteRecords: function(store, type, records) {
    var namespace = this._namespaceForType(type);
    this._async(function() {
      records.forEach(function(record) {
        var id = record.get('id');
        delete namespace.records[id];
      });
      this._didSaveRecords(store, type, records);
    });

  },

  dirtyRecordsForHasManyChange: function(dirtySet, parent, relationship) {
    dirtySet.add(parent);
  },

  dirtyRecordsForBelongsToChange: function(dirtySet, child, relationship) {
    dirtySet.add(child);
  },

  // private

  _getNamespace: function() {
    return this.namespace || 'DS.LSAdapter';
  },

  _loadData: function() {
    var storage = localStorage.getItem(this._getNamespace());
    this._data = storage ? JSON.parse(storage) : {};
  },

  _didSaveRecords: function(store, type, records) {
    var success = this._saveData();
    if (success) {
      store.didSaveRecords(records);
    } else {
      records.forEach(function(record) {
        store.recordWasError(record);
      });
      this.trigger('QUOTA_EXCEEDED_ERR', records);
    }
  },

  _saveData: function() {
    try {
      localStorage.setItem(this._getNamespace(), JSON.stringify(this._data));
      return true;
    } catch(error) {
      if (error.name == 'QUOTA_EXCEEDED_ERR') {
        return false;
      } else {
        throw new Error(error);
      }
    }
  },

  _namespaceForType: function(type) {
    var namespace = type.url || type.toString();
    return this._data[namespace] || (
      this._data[namespace] = { last_id: 0, records: {}}
    );
  },

  _addRecordToNamespace: function(namespace, record) {
    var id = namespace.last_id = namespace.last_id + 1;
    record.set('id', id);
    namespace.records[id] = record.toData({includeId:true});
  },

  _async: function(callback) {
    var _this = this;
    setTimeout(function(){ callback.call(_this);}, 1);
  }

});


