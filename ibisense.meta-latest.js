//-------------------------------//
//      Ibisense JS Metadata     //
//          API plugin           //
//        version 1.0.4          //
//     (c) 2013 Ibisense Oy      //
//-------------------------------//

/* Metadata engine plugin */

if (typeof module !== 'undefined' && module.exports) {
    ibisense = global.ibisense || root.ibisense;
}

var ibisense = (function(parent) {
    var api,

        contains = function(arr, val) {
          var i, l = arr.length;
          for (i = 0; i < l; i++)
          {
            if (arr[i] === val) return true;
          }
          return false;
        },

        extend = function(l, r) {

            for(i in r) {
                l[i] = r[i];
            }

            return l;
        },

        isArray = function(obj) {
            return (obj instanceof Array);
        },

        log = function (msg) {
            try {
                if (window)
                    window.console.log(msg);
                else 
                    console.log(err);
            } catch(err) { }
        },
        
        jsonGet = function (url, data, success, failure, always, method) {
            var params = '';

            for (var key in data) {
                params += ((params || 
                url.indexOf("?") != -1)?'&':'?')+key+'='+data[key];
            }



            if (((typeof navigator) != "undefined")&&navigator.userAgent && navigator.userAgent.indexOf("MSIE") != -1 && 
                window.XDomainRequest) {
                var xdr = new XDomainRequest();
                xdr.open("GET", url+params);
                xdr.onload = function() {
                    if (success) {
                        var data = {};
                        var status = 200;
                        try {
                            var jsonObj = JSON.parse(xdr.responseText);
                            data = jsonObj.data || {};
                            status = jsonObj.status;
                        } catch (err) {

                        } finally {
                            if(success) success(data, status);
                            if(always) always();
                        }
                    }
                }

                xdr.onerror = function(){
                    var status = 500;
                    try {
                        var jsonObj = JSON.parse(xdr.responseText);
                        status = jsonObj.status;
                    } catch(err) {
                        console.log(err);
                    } finally {
                        if (failure) failure(status);
                        if(always) always();
                    }
                }

                xdr.ontimeout = function() {
                    if (failure) failure(500);
                    if(always) always();
                }
                xdr.send();
            } else {
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", url + params, true);
                    xhr.setRequestHeader("Content-type", "application/json");
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState==4) {
                            if (xhr.status==200 || xhr.status==201) {
                                if (success) {
                                    var jsonObj = JSON.parse(xhr.responseText);
                                    success(jsonObj.data, xhr.status);
                                }
                            } else {
                                console.log(xhr.responseText);
                                if (failure) failure(xhr.status);
                            }
                            if (always) always();
                        }
                    }
                    xhr.send();
                } catch(e) {
                    console.log(e.message);
                    throw e;
                }
            }
        },
        
        jsonPost = function (url, data, success, failure, always, method) {
           if (((typeof navigator) != "undefined")&&navigator.userAgent && navigator.userAgent.indexOf("MSIE") != -1 && 
                    window.XDomainRequest) {
                var xdr = new XDomainRequest();
                xdr.open("POST", url);
                xdr.onload = function() {
                    if (success) {
                        var data = {};
                        var status = 200;
                        try {
                            var jsonObj = JSON.parse(xdr.responseText);
                            data = jsonObj.data || {};
                            status = jsonObj.status;
                        } catch (err) {
                            console.log(err);
                        } finally {
                            if(success) success(data, status);
                            if(always) always();
                        }
                    }
                }
                xdr.onprogress = function () {}
                xdr.onerror = function() {
                    var status = 0;
                    try {
                        console.log(xdr.responseText);
                        var jsonObj = JSON.parse(xdr.responseText);
                        status = jsonObj.status;
                    } catch(err) {
                        console.log(err);
                    } finally {
                        if (failure) failure(status);
                        if(always) always();
                    }
                }
                xdr.ontimeout = function() {
                    if (failure) failure(500);
                    if(always) always();
                }
                xdr.send(data);
            } else {

                try {
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", url, true);
                    
                    xhr.setRequestHeader("Content-type", "application/json");
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState==4) {
                            if (xhr.status==200 || xhr.status==201) {
                                if (success) {
                                    var jsonObj = JSON.parse(xhr.responseText);
                                    success(jsonObj.data, xhr.status);
                                }
                            } else {
                                if (failure) failure(xhr.status);
                            }
                            if (always) always();
                        }
                    }
                    xhr.send(data);
                } catch(e) {
                    log(e.message);
                    throw e;
                }
            }
        },
        
        httprequest = function (options) {

            options.type = options.type || "GET";
            var settings = options;
            if (!settings.url) {
                throw "API URL is not set";
            }
                
            if (settings.type === "PUT" || settings.type === "POST" ||
                settings.type === "UPDATE") {
                if (!settings.data || typeof settings.data !== 'object') {
                    return;
                } else {
                    settings.data = JSON.stringify(settings.data);
                }
                
                jsonPost(settings.url, settings.data, 
                            settings.success, settings.error, 
                            settings.final, settings.type);
            } else if (settings.type === "GET" || 
                        settings.type === "DELETE") {
                jsonGet(settings.url, settings.data, 
                            settings.success, settings.error, 
                            settings.final, settings.type);
            }
        };

    /**
     * @namespace ibisense
     */
    api = {
        /**
         * @namespace db
         * @memberOf ibisense
         */
        db: {
        /** 
        * Creates an instance of MetaDB class. This constructor is suitable for calling if it is known that
        * the database and the collection exist in Ibisense cloud and the user has access to it. Otherwise,
        * this it is recommended to initialize this class by calling ibisense.objects.db method.
        *
        * @param {String} dbName - Name of the database 
        * @param {String} dbCollection - Name of the collection in database dbName
        * @class MetaDB
        * @memberOf ibisense.db
        * 
        * @example
        * ibisense.setApiKey(myApiKey);
        * var db = new ibisense.db.MetaDB("metso", "events");
        *   function onPutSuccess() {
        *     alert('Event was stored');
        *   }
        *  
        *   function onPutError(status) {
        *     alert('Failed to put event into the database (' + status + ')');   
        *   }
        *
        *   var myEvent = {
        *     eventId: 1,
        *     sensorId: 'h1asqwc0',
        *     sensorTag: 'TAG-01',
        *     eventTime: 1374146880, //Unix timestamp for example
        *     sensorLocation: {
        *       latitude: 0,
        *       longitude: 0
        *     },
        *     eventType: 'service',
        *     eventAutoDescription: 'warning',
        *     eventHistory: [], //you can fill it according to your needs
        *     humanDescription: '',
        *     priority: 0, //percentage from 0 - 100
        *     photo: '', //URL to image file
        *     completionStatus: ''
        *   }
        * 
        *   db.put(myEvent, onPutSuccess, onPutError);
        *
        *   //If it is not known whether the database and collection exists in the cloud
        *   //use ibisense.objects.db method to create an instance of this class as follows:
        *    
        * function onDbSuccess(db) {
        *   function onPutSuccess() {
        *     alert('Event was stored in Ibisense cloud');
        *   }
        *  
        *   function onPutError(status) {
        *     alert('Failed find event (' + status + ')');   
        *   }
        *
        *   var myEvent = {
        *     eventId: 1,
        *     sensorId: 'h1asqwc0',
        *     sensorTag: 'TAG-01',
        *     eventTime: 1374146880, //Unix timestamp for example
        *     sensorLocation: {
        *       latitude: 0,
        *       longitude: 0
        *     },
        *     eventType: 'service',
        *     eventAutoDescription: 'warning',
        *     eventHistory: [], //you can fill it according to your needs
        *     humanDescription: '',
        *     priority: 0, //percentage from 0 - 100
        *     photo: '', //URL to image file
        *     completionStatus: ''
        *   }
        *   db.put(myEvent, onPutSuccess, onPutError);
        * }
        *
        * function onDbError(status) {
        *   alert("Error: " + status);
        * }
        *
        * ibisense.setApiKey(myApiKey);
        * ibisense.objects.db("metso", "events", onDbSuccess, onDbError);
        */
     
        MetaDB: function(dbName, dbCollection) {
          this._name = dbName;
          this._collection = dbCollection;

          this.type = function() {
            return "ibisense.MetaDB";
          }
        
          this.name = function() {
            return this._name;
          }
        
          this.collection = function() {
            return this._collection;
          }
        
          /**
            * @typedef {Function} DatabasePutSuccessCallback 
            * @param {Number} status - HTTP status code
            */
        
          /**  Puts object into the database.
            *  Object should be a valid JSON object,
            *  otherwise an error will be raised.
            *  @function put
            *  @param {JSON} object - A JSON encoded object to be stored in the Ibisense cloud 
            *  @param {DatabasePutSuccessCallback} success A callback function called after object was successfully stored in Ibisense cloud
            *  @param {errorCallback} error A callback function which will be called on error
            *  @param {alwaysCallback} always A callback function which will be always called 
            *  @instance
            *  @memberOf ibisense.db.MetaDB
            *  
            * @example
            * function onDbSuccess(db) {
            *   function onPutSuccess() {
            *     alert('My event was store in Ibisense cloud');
            *   }
            *  
            *   function onPutError(status) {
            *     alert('Failed to find events (' + status + ')');   
            *   }
            *
            *   var myEvent = {
            *     eventId: 1,
            *     sensorId: 'h1asqwc0',
            *     sensorTag: 'TAG-01',
            *     eventTime: 1374146880, //Unix timestamp for example
            *     sensorLocation: {
            *       latitude: 0,
            *       longitude: 0
            *     },
            *     eventType: 'service',
            *     eventAutoDescription: 'warning',
            *     eventHistory: [], //you can fill it according to your needs
            *     humanDescription: '',
            *     priority: 0, //percentage from 0 - 100
            *     photo: '', //URL to image file
            *     completionStatus: ''
            *   }
            *   db.put(myEvent, onPutSuccess, onPutError);
            * }
            *
            * function onDbError(status) {
            *   alert("Error: " + status);
            * }
            *
            * ibisense.setApiKey(myApiKey);
            * ibisense.objects.db("metso", "events", onDbSuccess, onDbError);
            */ 
            this.put = function(object, onsuccess, onerror, always) {
              var shema = this._name + ":" + this._collection;
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/insert/" + shema + "/",
                data:    object,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (onsuccess) onsuccess(status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }
          /**
            * @typedef {Function} DatabaseUpdateSuccessCallback 
            * @param {Number} status - HTTP status code
            */
        
          /**  Updates the existing object in the database with the new one.
            *  Object should be a valid JSON object,
            *  otherwise an error will be raised.
            *  @function update
            *  @param {JSON} criteria - A criteria expressed as JSON object which is used to search for the object to upade in Ibisense cloud 
            *  @param {JSON} data - A JSON object to update with the one that matched the criteria (if any) in Ibisense cloud 
            *  @param {boolean} upsert - Indicates whether to insert data (call put request) if criteria did not match
            *  @param {DatabaseUpdateSuccessCallback} success - A callback function called after object was successfully updated in Ibisense cloud
            *  @param {errorCallback} error - A callback function which will be called on error
            *  @param {alwaysCallback} always - A callback function which will be always called 
            *  @instance
            *  @memberOf ibisense.db.MetaDB
            *  
            * @example
            * function onDbSuccess(db) {
            *   function onUpdateSuccess() {
            *     alert('Event was update');
            *   }
            *  
            *   function onUpdateError(status) {
            *     alert('Failed to update my event into database (' + status + ')');   
            *   }
            *
            *   var myEventCriteria = {
            *     eventId: 1,
            *     sensorId: 'h1asqwc0',
            *     sensorTag: 'TAG-01'
            *   }
            *
            *   var myEventUpdate = {
            *     eventId: 1,
            *     sensorId: 'h1asqwc0',
            *     sensorTag: 'TAG-01',
            *     eventTime: 1374146880, //Unix timestamp for example
            *     sensorLocation: {
            *       latitude: 0,
            *       longitude: 0
            *     },
            *     eventType: 'service',
            *     eventAutoDescription: 'warning',
            *     eventHistory: [], //you can fill it according to your needs
            *     humanDescription: '',
            *     priority: 0, //percentage from 0 - 100
            *     photo: '', //URL to image file
            *     completionStatus: ''
            *   }
            *   db.update(myEventCriteria, myEventUpdate, false, onUpdateSuccess, onUpdateError);
            * }
            *
            * function onDbError(status) {
            *   alert("Error: " + status);
            * }
            *
            * ibisense.setApiKey(myApiKey);
            * ibisense.objects.db("metso", "events", onDbSuccess, onDbError);
            */
            this.update = function(criteria, data, upsert, onsuccess, onerror, always) {
              var q = {criteria: criteria, update: data};
              var shema = this._name + ":" + this._collection;
              var opts = "?multi=false";
              if (upsert) opts += "&upsert=true";
              //if (multi) opts += "&multi=true";
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/update/" + shema + "/" + opts,
                data:    q,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (onsuccess) onsuccess(status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }


            this.removeOne = function(criteria, onsuccess, onerror, always) {
              var shema = this._name + ":" + this._collection;
              
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/delete/" + shema + "/?many=false",
                data:    criteria,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (onsuccess) onsuccess(status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }

            this.removeMany = function(criteria, onsuccess, onerror, always) {
              var shema = this._name + ":" + this._collection;
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/delete/" + shema + "/?many=true",
                data:    criteria,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (onsuccess) onsuccess(status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }

          /**
            * @typedef {Function} DatabaseFindOneSuccessCallback 
            * @param {JSONObject} object - An object that matched the criteria
            * @param {Number} status - HTTP status code
            */
        
          /**  Gets a first object that matched the specified criteria.
            *  Criteria should be a properly constructed JSON object,
            *  otherwise an error will be raised. Note criteria can some or all fields of the sought object. 
            *  @function findOne
            *  @param {JSON} criteria - A criteria encoded as a valid JSON object which will be used during the search
            *  @param {DatabaseFindOneSuccessCallback} success - A callback function called after object was successfully updated in Ibisense cloud
            *  @param {errorCallback} error - A callback function which will be called on error
            *  @param {alwaysCallback} always - A callback function which will be always called 
            *  @instance
            *  @memberOf ibisense.db.MetaDB
            *  
            * @example
            * function onDbSuccess(db) {
            *   function onFindOneSuccess(object) {
            *     alert('The sough object was found: ' + JSON.stringify(object));
            *   }
            *  
            *   function onFindOneError(status) {
            *     alert('Seach failed for my event (' + status + ')');   
            *   }
            *
            *   var myEventCriteria = {
            *     sensorId: 'h1asqwc0',
            *     sensorTag: 'TAG-01'
            *   }
            *
            *   db.findOne(myEventCriteria, onFindOneSuccess, onFindOneError);
            * }
            *
            * function onDbError(status) {
            *   alert("Error: " + status);
            * }
            *
            * ibisense.setApiKey(myApiKey);
            * ibisense.objects.db("metso", "events", onDbSuccess, onDbError);
            */
            this.findOne = function(criteria, onsuccess, onerror, always) {
              var shema = this._name + ":" + this._collection;
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/find/" + shema + "/?limit=1",
                data:    criteria,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (isArray(jsonObj)) {
                        if (onsuccess) onsuccess(jsonObj, status);
                    } else {
                        if (onerror) onerror(500);
                    }
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }
          /**
            * @typedef {Function} DatabaseFindManySuccessCallback 
            * @param {JSONArray} object - An object that matched the criteria
            * @param {Number} status - HTTP status code
            */
        
          /**  Gets all objects from the database that matched the specified criteria.
            *  Criteria should be a valid JSON object,
            *  otherwise an (HTTP 400) error will be raised. Note criteria can contain some or all fields 
            *  of the sought object. 
            *  @function findOne
            *  @param {JSON} criteria - A criteria encoded as a valid JSON object which will be used during the search
            *  @param {DatabaseFindManySuccessCallback} success - A callback function called after object was successfully updated in Ibisense cloud
            *  @param {errorCallback} error - A callback function which will be called on error
            *  @param {alwaysCallback} always - A callback function which will be always called 
            *  @instance
            *  @memberOf ibisense.db.MetaDB
            *  
            * @example
            * function onDbSuccess(db) {
            *   function onFindManySuccess(objects) {
            *     $.each(objects, function(i, o) {
            *       alert('The sough object was found: ' + JSON.stringify(o));
            *     });
            *   }
            *  
            *   function onFindManyError(status) {
            *     alert('Seach failed for my event (' + status + ')');   
            *   }
            *
            *   var myEventCriteria = {
            *     sensorId: 'h1asqwc0',
            *     sensorTag: 'TAG-01'
            *   }
            *
            *   db.findMany(myEventCriteria, onFindManySuccess, onFindManyError);
            * }
            *
            *
            * function onDbError(status) {
            *   alert("An error occured: " + status);
            * }
            *
            * ibisense.setApiKey(myApiKey);
            * ibisense.objects.db("metso", "events", onDbSuccess, onDbError);
            */
         
            this.findMany = function(criteria, onsuccess, onerror, always, options) {
              var shema = this._name + ":" + this._collection;
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/find/" + shema + "/",
                data:    criteria,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (onsuccess) onsuccess(jsonObj, status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }

            this.count = function(criteria, onsuccess, onerror, always) {
              var shema = this._name + ":" + this._collection;
              httprequest({
                type:    "POST",
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/count/" + shema + "/",
                data:    criteria,
                final: function() {
                    if (always) always();
                },
                success: function (jsonObj, status) {
                    if (onsuccess) onsuccess(jsonObj, status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                }
              });
            }

            this.putBlob = function(blob, name, onsucess, onerror) {
                
            }
    
            this.getBlob = function(name, onsuccess, onerror) {
    
            }
          }
        },
    
        /**
          * Provides access to objects databasse in Ibisense cloud
          * @namespace ibisense.objects
          * @memberOf ibisense
          */
        objects: {
        
          /**
            * @typedef {Function} errorCallback 
            * @param {Number} status - HTTP status code
            */
             
          /**
            * @typedef {Function} alwaysCallback 
          */
        
          /**
            * @typedef {Function} DatabaseInitSuccessCallback 
            * @param {@link ibisense.db.MetaDB} db - An instance of MetaDB class 
            * @param {Number} status - HTTP status code
            */
        
          /**
            * Gets or intializes an Ibisense object databse instance (if API key has appropriate permissions).
            * On success a callback function will return an instance of {@link ibisense.db.MetaDB} class 
            * which can be used to manipulate the data in the database.
            *
            * @function db
            * @param {String} name - The database name
            * @param {String} collection - The name of the collection in the databse
            * @param {DatabaseInitSuccessCallback} success - A callback function called on success
            * @param {errorCallback} error - A callback function which will be called on error
            * @param {alwaysCallback} always - A callback function which will be always called 
            * independantly if the API call is a success or failure. The function does not take any parameters.
            * @type {Void}
            * @memberOf ibisense.objects
            *
            * @example
            * function onDbSuccess(db) {
            *   function onPutSuccess() {
            *     alert('My event was store in Ibisense cloud');
            *   }
            *  
            *   function onPutError(status) {
            *     alert('Failed to put my event into database (' + status + ')');   
            *   }
            *
            *   var myEvent = {
            *     eventId: 1,
            *     sensorId: 'h1asqwc0',
            *     sensorTag: 'TAG-01',
            *     eventTime: 1374146880, //Unix timestamp for example
            *     sensorLocation: {
            *       latitude: 0,
            *       longitude: 0
            *     },
            *     eventType: 'service',
            *     eventAutoDescription: 'warning',
            *     eventHistory: [], //you can fill it according to your needs
            *     humanDescription: '',
            *     priority: 0, //percentage from 0 - 100
            *     photo: '', //URL to image file
            *     completionStatus: ''
            *   }
            *   db.put(myEvent, onPutSuccess, onPutError);
            * }
            *
            * function onDbError(status) {
            *   alert("An error occured: " + status);
            * }
            *
            * ibisense.setApiKey(myApiKey);
            * ibisense.objects.db("metso", "events", onDbSuccess, onDbError);
            */
        
            db: function(name, collection, onsuccess, onerror, always) {
              httprequest({
                url:     parent.baseurl + "metadata/" + parent.apiKey() + "/db/" + name + ":" + collection + "/",
                success: function (retval, status) {
                    var dbObj = new ibisense.db.MetaDB(name, collection);
                    if (onsuccess) onsuccess(dbObj, status);
                },
                error: function(status) {
                    if (onerror) onerror(status);
                },
                final: function() {
                    if (always) always();
                }
              });
            }
          }
        }
    return extend(parent, api);
})(ibisense);


if (typeof module !== 'undefined' && module.exports) {
    module.exports = ibisense;
    root.ibisense = ibisense;
}

