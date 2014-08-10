global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

var ibisense = require('../ibisense.core-latest.js');
var should   = require('should');
var assert   = require('assert');
var request  = require('supertest');

var when     = require("when");
var sequence = require('when/sequence');
var parallel = require('when/parallel');
var pipeline = require('when/pipeline');

var _        = require('underscore');

var url      = process.env.URL;
var key      = process.env.API_KEY;
assert.ok(url, "Missing URL of your deployment");
assert.ok(process.env.OWNER, "Missing OWNER string");

describe('Configuration test:', function() {
	it('should set properly API key and API url', function(done) {
		ibisense.baseurl(url);
		assert.equal(url, ibisense.baseurl());
		ibisense.apiKey(key);
		assert.equal(key, ibisense.apiKey());
		done();
	});
});


describe('Create, get and update sensor:', function() {
	it('should properly create, fetch and remove sensor', function(done) {
		this.timeout(10000);

		var newsensor = new ibisense.models.Sensor({name: "Mocha test sensor"});
		var createNewSensor = function(newsensor) {
			var dfd = when.defer();
			ibisense.sensors.add(newsensor, function(sensor) {
				dfd.resolve(sensor);
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var getCreatedSensor = function(suid) {
			var dfd = when.defer();
			ibisense.sensors.get(suid, function(sensor) {
				dfd.resolve(sensor);
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var updateCreatedSensor = function(sensor) {
			var dfd = when.defer();
			sensor.setAccessType("public");
			ibisense.sensors.update(sensor, function() {
				ibisense.sensors.get(sensor.suid(), function(updated_sensor) {
					dfd.resolve(updated_sensor);
				}, function(error) {
					dfd.reject(error);
				});
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var removeCreatedSensor = function(suid) {
			var dfd = when.defer();
			ibisense.sensors.remove(suid, function() {
				dfd.resolve();
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		when(createNewSensor(newsensor)).then(function(created_sensor) {
			assert.equal(created_sensor.name(), "Mocha test sensor");
			assert.equal(created_sensor.isPublic(), false);
			when(getCreatedSensor(created_sensor.suid())).then(function(fetched_sensor) {
				assert.equal(created_sensor.name(), fetched_sensor.name());
				assert.equal(created_sensor.suid(), fetched_sensor.suid());
				when(updateCreatedSensor(fetched_sensor)).then(function(updated_sensor) {
					assert.equal(updated_sensor.isPublic(), true);
					when(removeCreatedSensor(fetched_sensor.suid())).then(function() {
						done();
					}, function(error) {
						done(error);
					});
				}, function(error) {
					done(error);
				});
			}, function(error) {
				done(error);	
			});
		}, function(error) {
			done(error);
		});
	});
});

describe('List sensors:', function() {
	it('should list only privately-owned sensors', function(done) {
		var listPrivateSensors = function() {
			var dfd = when.defer();
			ibisense.sensors.list(function(sensor) {
				dfd.resolve(sensor);
			}, function(error) {
				dfd.reject(error);
			}, null, true);
			return dfd.promise;
		}

		when(listPrivateSensors()).then(function(sensors) {
			_.each(sensors, function(sensor, index) {
				assert.equal(sensor.owner(), process.env.OWNER);
			});
			done();
		}, function(error) {
			done(error);
		});
	});
});

describe('Add and get datapoitns:', function() {
	it('should correctly create sensor, create channel, insert and read out datapoints and delete sensor', function(done) {
		this.timeout(60000);

		var newsensor = new ibisense.models.Sensor({name: "Mocha test sensor"});
		var newchannel = new ibisense.models.Channel({name: "Mocha test channel"});

		var prepareData = function(start, end, step) {
			return _.map(_.range(start, end, step), function(ts, i) {
				return new ibisense.models.DataPoint({date: ts, value: i});
			});
		}

		var createNewSensor = function(newsensor) {
			var dfd = when.defer();
			ibisense.sensors.add(newsensor, function(sensor) {
				dfd.resolve(sensor);
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var createNewChannel = function(suid, newchannel) {
			var dfd = when.defer();
			ibisense.channels.add(suid, newchannel, function(channel) {
				dfd.resolve(channel);
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var addDatapoints = function(cuid, datapoints) {
			var dfd = when.defer();

			ibisense.datapoints.add(cuid, datapoints, function() {
				dfd.resolve();
			}, function(error) {
				dfd.reject(error);
			});

			return dfd.promise;
		}

		var getAndCompareDatapoints = function(cuid, start, end, original_datapoints) {
			var dfd = when.defer();
			var query = {
				cuid: cuid,
				start: new Date(start).toISOString(),
				end: new Date(end).toISOString()
			};

			ibisense.datapoints.get(query, function(dataset) {
				dfd.resolve(dataset.datapoints());
			}, function(error) {
				dfd.reject(dataset.datapoints);
			});

			return dfd.promise;
		}

		var deleteSensor = function(suid) {
			ibisense.sensors.remove(suid);
		}

		var cuid  = undefined;

		var num   = 100;  
		var step  = 1000; // 1 second

		var end   = new Date().getTime();
		var start = end - num * step;
		var original_datapoints = prepareData(start, end + 1, step);
		var propagation_delay = 5000; // wait 5 seconds before attempting to read out data
		
		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel)).then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints)).then(function(received_datapoints) {
					setTimeout(function() {
						when(getAndCompareDatapoints(cuid, start, end, original_datapoints)).then(
						function(received_datapoints) {
							assert.equal(received_datapoints.length, original_datapoints.length);
							_.each(received_datapoints, function(dp, i) {
								var odp = original_datapoints[i];
								assert.equal(odp.timestampMs(), dp.timestampMs());
							});
							deleteSensor(newsensor.suid());
							done();
						}, function(error) {
							deleteSensor(newsensor.suid());
							done(error);
						});
					}, propagation_delay);
				}, function(error) {
					deleteSensor(newsensor.suid());
					done(error);
				});
			}, function(error) {
				deleteSensor(newsensor.suid());
				done(error);
			});
		}, function(error) { 
			done(error);
		});
	});
});


describe('Add and get with rollups:', function() {
	it('should correctly create sensor, create channel, insert and read out datapoints using average aggregator function and delete sensor', function(done) {
		this.timeout(120000);

		var newsensor = new ibisense.models.Sensor({name: "Mocha test sensor"});
		var newchannel = new ibisense.models.Channel({name: "Mocha test channel"});

		var prepareData = function(start, end, step) {
			return _.map(_.range(start, end, step), function(ts, i) {
				return new ibisense.models.DataPoint({date: ts, value: i});
			});
		}

		var createNewSensor = function(newsensor) {
			var dfd = when.defer();
			ibisense.sensors.add(newsensor, function(sensor) {
				dfd.resolve(sensor);
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var createNewChannel = function(suid, newchannel) {
			var dfd = when.defer();
			ibisense.channels.add(suid, newchannel, function(channel) {
				dfd.resolve(channel);
			}, function(error) {
				dfd.reject(error);
			});
			return dfd.promise;
		}

		var addDatapoints = function(cuid, datapoints) {
			var dfd = when.defer();

			ibisense.datapoints.add(cuid, datapoints, function() {
				dfd.resolve();
			}, function(error) {
				dfd.reject(error);
			});

			return dfd.promise;
		}

		var getAndCompareDatapoints = function(cuid, start, end, func, interval, original_datapoints) {
			var dfd = when.defer();
			var query = {
				cuid: cuid,
				start: new Date(start).toISOString(),
				end: new Date(end).toISOString(),
				func: func, 
				interval: interval
			};

			ibisense.datapoints.get(query, function(dataset) {
				dfd.resolve(dataset.datapoints());
			}, function(error) {
				dfd.reject(dataset.datapoints);
			});

			return dfd.promise;
		}

		var deleteSensor = function(suid) {
			ibisense.sensors.remove(suid);
		}

		var cuid  = undefined;

		var num   = 100;  
		var step  = 1000; // 1 second

		var end   = new Date().getTime();
		var start = end - num * step;
		var original_datapoints = prepareData(start, end + 1, step);
		var propagation_delay   = 5000; // wait 5 seconds before attempting to read out data
		var func  = "avg";
		var ival  = "10sec"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel)).then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints)).then(function(received_datapoints) {
					setTimeout(function() {
						when(getAndCompareDatapoints(cuid, start, end, func, ival, original_datapoints)).then(
						function(received_datapoints) {
							assert.equal(received_datapoints.length, Math.ceil(original_datapoints.length / 10));
							deleteSensor(newsensor.suid());
							done();
						}, function(error) {
							deleteSensor(newsensor.suid());
							done(error);
						});
					}, propagation_delay);
				}, function(error) {
					deleteSensor(newsensor.suid());
					done(error);
				});
			}, function(error) {
				deleteSensor(newsensor.suid());
				done(error);
			});
		}, function(error) { 
			done(error);
		});
	});
});

