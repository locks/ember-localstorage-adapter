/*global Ember*/
/*global DS*/
(function () {
  'use strict';

  DS.LSSerializer = DS.JSONSerializer.extend({

	 /**
     * Invokes the new serializer API.
     * This should be removed in 2.0
     */
    isNewSerializerAPI: true,

    serializeHasMany: function(snapshot, json, relationship) {
      var key = relationship.key;
      var payloadKey = this.keyForRelationship ? this.keyForRelationship(key, "hasMany") : key;
      var relationshipType = snapshot.type.determineRelationshipType(relationship, this.store);

      if (relationshipType === 'manyToNone' ||
          relationshipType === 'manyToMany' ||
          relationshipType === 'manyToOne') {
        json[payloadKey] = snapshot.hasMany(key, { ids: true });
        // TODO support for polymorphic manyToNone and manyToMany relationships
      }
    },

	/**
     * Extracts whatever was returned from the adapter.
     *
     * If the adapter returns relationships in an embedded way, such as follows:
     *
     * ```js
     * {
     *   "id": 1,
     *   "title": "Rails Rambo",
     *
     *   "_embedded": {
     *     "comment": [{
     *       "id": 1,
     *       "comment_title": "FIRST"
     *     }, {
     *       "id": 2,
     *       "comment_title": "Rails is unagi"
     *     }]
     *   }
     * }
     *
     * this method will create separated JSON for each resource and then combine
     * the data and the embed payload into the JSON.Api spec for included objects
     * returning a single object.
     *
     * @method extractSingle
     * @private
     * @param {DS.Store} store the returned store
     * @param {DS.Model} type the type/model
     * @param {Object} payload returned JSON
     */
    normalizeSingleResponse: function(store, type, payload) {
      var included = [];

      if (payload && payload._embedded) {
        var _this = this;
        var forEachFunc = function(record){
          included.pushObject(_this.normalize(relType,record).data);
        };

        for (var relation in payload._embedded) {
          var relType = type.typeForRelationship(relation,store);
          var typeName = relType.modelName,
              embeddedPayload = payload._embedded[relation];

          if (embeddedPayload) {
            if (Ember.isArray(embeddedPayload)) {
              embeddedPayload.forEach(forEachFunc);
            } else {
              included.pushObject(this.normalize(relType, embeddedPayload).data);
            }
          }
        }

        delete payload._embedded;
      }

      var normalPayload = this.normalize(type, payload);
      if(included.length > 0){
        normalPayload.included = included;
      }
      return normalPayload;
    },

	/**
     * This is exactly the same as extractSingle, but used in an array.
     *
     * @method extractSingle
     * @private
     * @param {DS.Store} store the returned store
     * @param {DS.Model} type the type/model
     * @param {Array} payload returned JSONs
     */
    normalizeArrayResponse: function(store, type, payload) {
       var response = { data: [], included: [] };
       var _this = this;
      payload.forEach(function(json){
        var normalized = _this.normalizeSingleResponse(store, type, json);
        response.data.pushObject(normalized.data);

        if(normalized.included){
          normalized.included.forEach(function(included){
            if(!response.included.contains(included.id)){
              response.included.addObject(included);
            }
          });
        }
      });

      return response;
    }

  });

  DS.LSAdapter = DS.Adapter.extend(Ember.Evented, {

    _storage: null,//where the copy of the data of localStorage will be stored
    useSnapshot: true,//set to false if ever anyone would like to come back to previous behavior
    timeOutSnapshot: 200,//play with the parameter, shorter time = performance decreased, higher value=risk of losing data when reloading the page
    _hasChanged: false,//flag to detect pushed data,

    /**
    * This governs if promises will be resolved immeadiatly for `findAll`
    * requests or if they will wait for the store requests to finish. This matches
    * the ember < 2.0 behavior.
    * [deprecation id: ds.adapter.should-reload-all-default-behavior]
    */
    shouldReloadAll: function(modelClass, snapshotArray){
      return true;
    },

    /**
     * Conforms to ember <2.0 behavior, in order to remove deprecation.
     * Probably safe to remove if running on ember 2.0
     * [deprecation id: ds.model.relationship-changing-to-asynchrounous-by-default]
     */
    shouldBackgroundReloadRecord: function(){
      return false;
    },

    /**
      This is the main entry point into finding records. The first parameter to
      this method is the model's name as a string.

      @method find
      @param {DS.Model} type
      @param {Object|String|Integer|null} id
      */
    findRecord: function(store, type, id, opts) {
      var allowRecursive = true;
      var namespace = this._namespaceForType(type);
      var record = Ember.A(namespace.records[id]);

      /**
       * In the case where there are relationships, this method is called again
       * for each relation. Given the relations have references to the main
       * object, we use allowRecursive to avoid going further into infinite
       * recursiveness.
       *
       * Concept from ember-indexdb-adapter
       */
      if (opts && typeof opts.allowRecursive !== 'undefined') {
        allowRecursive = opts.allowRecursive;
      }

      if (!record || !record.hasOwnProperty('id')) {
        return Ember.RSVP.reject(new Error("Couldn't find record of" + " type '" + type.modelName + "' for the id '" + id + "'."));
      }

      if (allowRecursive) {
        return this.loadRelationships(store, type, record);
      } else {
        return Ember.RSVP.resolve(record);
      }
    },

    findMany: function (store, type, ids, opts) {
      var namespace = this._namespaceForType(type);
      var adapter = this,
          allowRecursive = true,
          results = [], record;

      /**
       * In the case where there are relationships, this method is called again
       * for each relation. Given the relations have references to the main
       * object, we use allowRecursive to avoid going further into infinite
       * recursiveness.
       *
       * Concept from ember-indexdb-adapter
       */
      if (opts && typeof opts.allowRecursive !== 'undefined') {
        allowRecursive = opts.allowRecursive;
      }
      if (allowRecursive) {
        Ember.beginPropertyChanges();
      }

      for (var i = 0; i < ids.length; i++) {
        record = namespace.records[ids[i]];
        if (!record || !record.hasOwnProperty('id')) {
          return Ember.RSVP.reject(new Error("Couldn't find record of type '" + type.modelName + "' for the id '" + ids[i] + "'."));
        }
        results.push(Ember.copy(record));
      }

      if (results.get('length') && allowRecursive) {
        return this.loadRelationshipsForMany(store, type, results);
      } else {
        if (allowRecursive) {
          Ember.endPropertyChanges();
        }
        return Ember.RSVP.resolve(results);
      }
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
    query: function (store, type, query, recordArray) {
      var namespace = this._namespaceForType(type);
      var results = this._query(namespace.records, query);

      if (results.get('length')) {
        return this.loadRelationshipsForMany(store, type, results);
      } else {
        return Ember.RSVP.reject();
      }
    },

    _query: function (records, query) {
      var results = [], record;

      function recordMatchesQuery(record) {
        return Object.keys(query).every(function(property) {
          var test = query[property];
          if (Object.prototype.toString.call(test) === '[object RegExp]') {
            return test.test(record[property]);
          } else {
            return record[property] === test;
          }
        });
      }

      for (var id in records) {
        record = records[id];
        if (recordMatchesQuery(record)) {
          results.push(Ember.copy(record));
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

    createRecord: function (store, type, snapshot) {
      var namespaceRecords = this._namespaceForType(type);
      var serializer = store.serializerFor(type.modelName);
      var recordHash = serializer.serialize(snapshot, {includeId: true});

      namespaceRecords.records[recordHash.id] = recordHash;

      this.persistData(type, namespaceRecords);
      return Ember.RSVP.resolve();
    },

    updateRecord: function (store, type, snapshot) {
      var namespaceRecords = this._namespaceForType(type);
      var id = snapshot.id;
      var serializer = store.serializerFor(type.modelName);

      namespaceRecords.records[id] = serializer.serialize(snapshot, {includeId: true});

      this.persistData(type, namespaceRecords);
      return Ember.RSVP.resolve();
    },

    deleteRecord: function (store, type, snapshot) {
      var namespaceRecords = this._namespaceForType(type);
      var id = snapshot.id;

      delete namespaceRecords.records[id];

      this.persistData(type, namespaceRecords);
      return Ember.RSVP.resolve();
    },

    generateIdForRecord: function () {
      return Math.random().toString(32).slice(2).substr(0, 5);
    },

    // private

    adapterNamespace: function () {
      return this.get('namespace') || 'DS.LSAdapter';
    },

    loadData: function () { 
      var storage,arr,arr_cp;
      if (!this._storage||!this.useSnapshot) {
        storage = this.getLocalStorage().getItem(this.adapterNamespace());
        arr = storage ? JSON.parse(storage) : {};
        if (this.useSnapshot) {
          this._storage=arr;
        }
      }
      else {
        arr=this._storage;
      }
      var cp=Ember.copy(arr,true);
      return cp;
    },

    timerPushLocalStorage: null,
    _launchPushLocalStorage: function() {
      if (this.get('_hasChanged')) {
        Ember.run.debounce(this,'_pushLocalStorage',this.timeoutSnapshot);
      }
    }.observes('_hasChanged'),
    _pushLocalStorage: function() {
      if (!this.useSnapshot || !this._storage) {return false;}
      if (this.get('_hasChanged')) {
        this.getLocalStorage().setItem(this.adapterNamespace(), JSON.stringify(this._storage));
        this.set('_hasChanged',false);
      }
    },

    persistData: function(modelClass, data) {
      var modelNamespace = this.modelNamespace(modelClass);
      if (this.useSnapshot) {
        if (!this._storage) {this._storage=this.loadData();}
        this._storage[modelNamespace] = Ember.copy(data);
        this.set('_hasChanged',true);
      }
      else {
        var localStorageData = this.loadData();
        localStorageData[modelNamespace] = data;
        this.getLocalStorage().setItem(this.adapterNamespace(), JSON.stringify(localStorageData));
      }
    },

    getLocalStorage: function() {
      if (this._localStorage) { return this._localStorage; }

      var storage;
      try {
        storage = this.getNativeStorage() || this._enableInMemoryStorage();
      } catch (e) {
        storage = this._enableInMemoryStorage(e);
      }
      this._localStorage = storage;
      return this._localStorage;
    },

    _enableInMemoryStorage: function(reason) {
      this.trigger('persistenceUnavailable', reason);
      return {
        storage: {},
        getItem: function(name) {
          return this.storage[name];
        },
        setItem: function(name, value) {
          this.storage[name] = value;
        }
      };
    },

    // This exists primarily as a testing extension point
    getNativeStorage: function() {
      return localStorage;
    },

    _namespaceForType: function (type) {
      var namespace = this.modelNamespace(type);
      var storage   = this.loadData();

      return storage[namespace] || {records: {}};
    },

    modelNamespace: function(type) {
      return type.url || type.modelName;
    },


    /**
     * This takes a record, then analyzes the model relationships and replaces
     * ids with the actual values.
     *
     * Stolen from ember-indexdb-adapter
     *
     * Consider the following JSON is entered:
     *
     * ```js
     * {
     *   "id": 1,
     *   "title": "Rails Rambo",
     *   "comments": [1, 2]
     * }
     *
     * This will return:
     *
     * ```js
     * {
     *   "id": 1,
     *   "title": "Rails Rambo",
     *   "comments": [1, 2]
     *
     *   "_embedded": {
     *     "comment": [{
     *       "_id": 1,
     *       "comment_title": "FIRST"
     *     }, {
     *       "_id": 2,
     *       "comment_title": "Rails is unagi"
     *     }]
     *   }
     * }
     *
     * This way, whenever a resource returned, its relationships will be also
     * returned.
     *
     * @method loadRelationships
     * @private
     * @param {DS.Model} type
     * @param {Object} record
     */
    loadRelationships: function(store, type, record) {
      var adapter = this,
          resultJSON = {},
          modelName = type.modelName,
          relationshipNames, relationships,
          relationshipPromises = [];

      /**
       * Create a chain of promises, so the relationships are
       * loaded sequentially.  Think of the variable
       * `recordPromise` as of the accumulator in a left fold.
       */
      var recordPromise = Ember.RSVP.resolve(record);

      relationshipNames = Ember.get(type, 'relationshipNames');
      relationships = relationshipNames.belongsTo
        .concat(relationshipNames.hasMany);

      relationships.forEach(function(relationName) {
        var relationModel = type.typeForRelationship(relationName,store);
        var relationEmbeddedId = record[relationName];
        var relationProp  = adapter.relationshipProperties(type, relationName);
        var relationType  = relationProp.kind;
        var foreignAdapter = store.adapterFor(relationModel.modelName);

        var opts = {allowRecursive: false};

        /**
         * embeddedIds are ids of relations that are included in the main
         * payload, such as:
         *
         * {
         *    cart: {
         *      id: "s85fb",
         *      customer: "rld9u"
         *    }
         * }
         *
         * In this case, cart belongsTo customer and its id is present in the
         * main payload. We find each of these records and add them to _embedded.
         */
        if (relationEmbeddedId && DS.LSAdapter.prototype.isPrototypeOf(adapter))
        {
          recordPromise = recordPromise.then(function(recordPayload) {
            var promise;
            if (relationType === 'belongsTo' || relationType === 'hasOne') {
              promise = adapter.findRecord(null, relationModel, relationEmbeddedId, opts);
            } else if (relationType == 'hasMany') {
              promise = adapter.findMany(null, relationModel, relationEmbeddedId, opts);
            }

            return promise.then(function(relationRecord) {
              return adapter.addEmbeddedPayload(recordPayload, relationName, relationRecord);
            });
          });
        }
      });

      return recordPromise;
    },


    /**
     * Given the following payload,
     *
     *   {
     *      cart: {
     *        id: "1",
     *        customer: "2"
     *      }
     *   }
     *
     * With `relationshipName` being `customer` and `relationshipRecord`
     *
     *   {id: "2", name: "Rambo"}
     *
     * This method returns the following payload:
     *
     *   {
     *      cart: {
     *        id: "1",
     *        customer: "2"
     *      },
     *      _embedded: {
     *        customer: {
     *          id: "2",
     *          name: "Rambo"
     *        }
     *      }
     *   }
     *
     * which is then treated by the serializer later.
     *
     * @method addEmbeddedPayload
     * @private
     * @param {Object} payload
     * @param {String} relationshipName
     * @param {Object} relationshipRecord
     */
    addEmbeddedPayload: function(payload, relationshipName, relationshipRecord) {
      var objectHasId = (relationshipRecord && relationshipRecord.id);
      var arrayHasIds = (relationshipRecord.length && relationshipRecord.isEvery("id"));
      var isValidRelationship = (objectHasId || arrayHasIds);

      if (isValidRelationship) {
        if (!payload._embedded) {
          payload._embedded = {};
        }

        payload._embedded[relationshipName] = relationshipRecord;
        if (relationshipRecord.length) {
          payload[relationshipName] = relationshipRecord.mapBy('id');
        } else {
          payload[relationshipName] = relationshipRecord.id;
        }
      }

      if (this.isArray(payload[relationshipName])) {
        payload[relationshipName] = payload[relationshipName].filter(function(id) {
          return id;
        });
      }

      return payload;
    },


    isArray: function(value) {
      return Object.prototype.toString.call(value) === '[object Array]';
    },

    /**
     * Same as `loadRelationships`, but for an array of records.
     *
     * @method loadRelationshipsForMany
     * @private
     * @param {DS.Model} type
     * @param {Object} recordsArray
     */
    loadRelationshipsForMany: function(store, type, recordsArray) {
      var adapter = this,
          promise = Ember.RSVP.resolve([]);

      /**
       * Create a chain of promises, so the records are loaded sequentially.
       * Think of the variable promise as of the accumulator in a left fold.
       */
      recordsArray.forEach(function(record) {
        promise = promise.then(function(records) {
          return adapter.loadRelationships(store, type, record)
            .then(function(loadedRecord) {
              records.push(loadedRecord);
              return records;
            });
        });
      });

      return promise;
    },


    /**
     *
     * @method relationshipProperties
     * @private
     * @param {DS.Model} type
     * @param {String} relationName
     */
    relationshipProperties: function(type, relationName) {
      var relationships = Ember.get(type, 'relationshipsByName');
      if (relationName) {
        return relationships.get(relationName);
      } else {
        return relationships;
      }
    }
  });
}());
