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

describe('Check sensor fields: ', function() {
	it('should create a sensor with pre-initialized fileds and then read it out from the database', function(done) {
		this.timeout(10000);

		var newsensor = new ibisense.models.Sensor({
			SUID           : "override",
			name           : "Mocha test sensor",
			description    : "this is a test sensor that will be deleted after the test run!",
			latitude       : 60.203381,
			longitude      : 24.778236,
			indoor_x       : 1.0,
			indoor_y       : 1.1,
			indoor_id      : 1,
			attributes     : {"type": "test"}
		});

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
			try {
				assert.notOk(created_sensor.suid(), "override");
				assert.equal(created_sensor.name(), "Mocha test sensor");
				assert.equal(created_sensor.isPublic(), false);
			} catch(error) {
				removeCreatedSensor(created_sensor.suid());
				done(error);
			}
			when(getCreatedSensor(created_sensor.suid())).then(function(fetched_sensor) {
				try {
					assert.equal(fetched_sensor.name(), newsensor.name());
					assert.equal(fetched_sensor.isPublic(), false);
					assert.equal(fetched_sensor.owner(), process.env.OWNER);
					assert.equal(fetched_sensor.description(), newsensor.description());
					assert.equal(fetched_sensor.indoor_location().x, newsensor.indoor_location().x);
					assert.equal(fetched_sensor.indoor_location().y, newsensor.indoor_location().y);
					assert.equal(fetched_sensor.indoor_location().id, newsensor.indoor_location().id);
					assert.equal(fetched_sensor.latitude(), newsensor.latitude());
					assert.equal(fetched_sensor.longitude(), newsensor.longitude());
					_.each(fetched_sensor.attributes(), function(value, key) {
						assert.equal(fetched_sensor.attribute(key), newsensor.attribute(key));
					});
					done();
				} catch (error) {
					done(error);
				} finally {
					removeCreatedSensor(fetched_sensor.suid())
				}
			}, function(error) {
				done(error);	
			});
		}, function(error) {
			done(error);
		});

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
			try {
				assert.equal(created_sensor.name(), "Mocha test sensor");
				assert.equal(created_sensor.isPublic(), false);
			} catch(error) {
				removeCreatedSensor(fetched_sensor.suid());
				done(error);
			}
			when(getCreatedSensor(created_sensor.suid())).then(function(fetched_sensor) {
				try {
					assert.equal(created_sensor.name(), fetched_sensor.name());
					assert.equal(created_sensor.suid(), fetched_sensor.suid());
				} catch(error) {
					removeCreatedSensor(fetched_sensor.suid());
					done(error);
				}
				when(updateCreatedSensor(fetched_sensor)).then(function(updated_sensor) {
					try {
						assert.equal(updated_sensor.isPublic(), true);
					} catch(error) {
						removeCreatedSensor(fetched_sensor.suid());
						done(error);
					}
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
				try {
					assert.equal(sensor.owner(), process.env.OWNER);
				} catch(error) {
					done(error);
				}
				
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

		var queryDatapoints = function(cuid, start, end) {
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
						when(queryDatapoints(cuid, start, end)).then(
						function(received_datapoints) {
							assert.equal(received_datapoints.length, original_datapoints.length);
							_.each(received_datapoints, function(dp, i) {
								var odp = original_datapoints[i];
								try {
									assert.equal(odp.timestampMs(), dp.timestampMs());
									assert.equal(odp.value(), dp.value());
								} catch(error) {
									deleteSensor(fetched_sensor.suid());
									done(error);
								}
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

describe('Add and get datapoitns:', function() {
	it('should correctly create sensor, create channel, insert and read out datapoints with time zone offset and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, tz) {
			var dfd = when.defer();
			var query = {
				cuid  : cuid,
				start : new Date(start).toISOString(),
				end   : new Date(end).toISOString(),
				tz    : tz
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

		var end    = new Date().getTime();
		var start  = end - num * step;
		var tz     = "Europe/Helsinki";
		var offset = 3*60*60*1000; 
		var original_datapoints = prepareData(start, end + 1, step);

		var propagation_delay = 5000; // wait 5 seconds before attempting to read out data
		
		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel)).then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints)).then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, tz)).then(
						function(received_datapoints) {
							assert.equal(received_datapoints.length, original_datapoints.length);
							_.each(received_datapoints, function(dp, i) {
								var odp = original_datapoints[i];
								try {
									assert.equal(odp.timestampMs() + offset, dp.timestampMs());
									assert.equal(odp.value(), dp.value());
								} catch(error) {
									deleteSensor(fetched_sensor.suid());
									done(error);
								}
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
	it('should correctly create sensor, create channel, insert and rollup datapoints into 10 seconds bins using average aggregator function and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, func, interval) {
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

		var aggregate = function(datapoints) {
			var aggregated_datapoints = [];

			var accumulator = 0;
			var pivot = null;
			var interval = 10;

			_.each(datapoints, function(dp, i) {

				if (( (i + 1) % interval) == 1 ) {
					pivot = dp.timestamp();
				}

				if (( (i + 1) % interval) == 0) {
					accumulator += dp.value();
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator / interval
						})
					);
					accumulator = 0;
				} else {
					accumulator += dp.value();
				}

				if (datapoints.length - 1 == i) {
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
				}
			});
			return aggregated_datapoints;
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
		var aggregated_datapoints = aggregate(original_datapoints);
		var propagation_delay   = 5000; // wait 5 seconds before attempting to read out data
		var func  = "avg";
		var ival  = "10s"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, func, ival))
						.then(function(received_datapoints) {
							assert.equal(received_datapoints.length, Math.ceil(original_datapoints.length / 10));
							deleteSensor(newsensor.suid());

							_.each(received_datapoints, function(dp, i) {
								var dpa = aggregated_datapoints[i];
								assert.equal(dp.timestampMs(), dpa.timestampMs());
								assert.equal(dp.value(), dpa.value());
							});

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
	it('should correctly create sensor, create channel, insert and rollup datapoints into 10 seconds bins using sum aggregator function and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, func, interval) {
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

		var aggregate = function(datapoints) {
			var aggregated_datapoints = [];

			var accumulator = 0;
			var pivot = null;
			var interval = 10;

			_.each(datapoints, function(dp, i) {

				if (( (i + 1) % interval) == 1 ) {
					pivot = dp.timestamp();
				}

				if (( (i + 1) % interval) == 0) {
					accumulator += dp.value();
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
					accumulator = 0;
				} else {
					accumulator += dp.value();
				}

				if (datapoints.length - 1 == i) {
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
				}
			});
			return aggregated_datapoints;
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
		var aggregated_datapoints = aggregate(original_datapoints);
		var propagation_delay   = 5000; // wait 5 seconds before attempting to read out data
		var func  = "sum";
		var ival  = "10s"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, func, ival))
						.then(function(received_datapoints) {
							assert.equal(received_datapoints.length, Math.ceil(original_datapoints.length / 10));
							deleteSensor(newsensor.suid());

							_.each(received_datapoints, function(dp, i) {
								var dpa = aggregated_datapoints[i];
								assert.equal(dp.timestampMs(), dpa.timestampMs());
								assert.equal(dp.value(), dpa.value());
							});

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
	it('should correctly create sensor, create channel, insert and rollup datapoints into 10 seconds bins using max aggregator function and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, func, interval) {
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

		var aggregate = function(datapoints) {
			var aggregated_datapoints = [];

			var accumulator = Number.MIN_VALUE;
			var pivot = null;
			var interval = 10;

			_.each(datapoints, function(dp, i) {

				if (( (i + 1) % interval) == 1 ) {
					pivot = dp.timestamp();
				}

				if (( (i + 1) % interval) == 0) {
					if (accumulator < dp.value()) accumulator = dp.value();
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
					accumulator = Number.MIN_VALUE;
				} else {
					if (accumulator < dp.value()) accumulator = dp.value();
				}

				if (datapoints.length - 1 == i) {
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
				}
			});
			return aggregated_datapoints;
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
		var aggregated_datapoints = aggregate(original_datapoints);
		var propagation_delay   = 5000; // wait 5 seconds before attempting to read out data
		var func  = "max";
		var ival  = "10s"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, func, ival))
						.then(function(received_datapoints) {
							assert.equal(received_datapoints.length, Math.ceil(original_datapoints.length / 10));
							deleteSensor(newsensor.suid());

							_.each(received_datapoints, function(dp, i) {
								var dpa = aggregated_datapoints[i];
								assert.equal(dp.timestampMs(), dpa.timestampMs());
								assert.equal(dp.value(), dpa.value());
							});

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
	it('should correctly create sensor, create channel, insert and rollup datapoints into 10 seconds bins using min aggregator function and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, func, interval) {
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

		var aggregate = function(datapoints) {
			var aggregated_datapoints = [];

			var accumulator = Number.MAX_VALUE;
			var pivot = null;
			var interval = 10;

			_.each(datapoints, function(dp, i) {

				if (( (i + 1) % interval) == 1 ) {
					pivot = dp.timestamp();
				}

				if (( (i + 1) % interval) == 0) {
					if (accumulator >= dp.value()) accumulator = dp.value();
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
					accumulator = Number.MAX_VALUE;
				} else {
					if (accumulator >= dp.value()) accumulator = dp.value();
				}

				if (datapoints.length - 1 == i) {
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: dp.value()
						})
					);
				}
			});
			return aggregated_datapoints;
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
		var aggregated_datapoints = aggregate(original_datapoints);
		var propagation_delay   = 5000; // wait 5 seconds before attempting to read out data
		var func  = "min";
		var ival  = "10s"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, func, ival))
						.then(function(received_datapoints) {
							assert.equal(received_datapoints.length, Math.ceil(original_datapoints.length / 10));
							deleteSensor(newsensor.suid());

							_.each(received_datapoints, function(dp, i) {
								var dpa = aggregated_datapoints[i];
								assert.equal(dp.timestampMs(), dpa.timestampMs());
								assert.equal(dp.value(), dpa.value());
							});

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
	it('should correctly create sensor, create channel, insert and rollup datapoints into 10 minutes bins using average aggregator function and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, func, interval) {
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
				dfd.reject(error);
			});

			return dfd.promise;
		}

		var aggregate = function(datapoints) {
			var aggregated_datapoints = [];

			var accumulator = 0;
			var pivot = null;
			var interval = 10;

			_.each(datapoints, function(dp, i) {

				if (( (i + 1) % interval) == 1 ) {
					pivot = dp.timestamp();
				}

				if (( (i + 1) % interval) == 0) {
					accumulator += dp.value();
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator / interval
						})
					);
					accumulator = 0;
				} else {
					accumulator += dp.value();
				}

				if (datapoints.length - 1 == i) {
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
				}
			});
			return aggregated_datapoints;
		}

		var deleteSensor = function(suid) {
			ibisense.sensors.remove(suid);
		}

		var cuid  = undefined;

		var num   = 100;  
		var step  = 60 * 1000; // 1 minute

		var end   = new Date().getTime();
		var start = end - num * step;
		var original_datapoints   = prepareData(start, end + 1, step);
		var aggregated_datapoints = aggregate(original_datapoints);
		var propagation_delay     = 5000; // wait 5 seconds before attempting to read out data
		var func  = "avg";
		var ival  = "10min"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, func, ival))
						.then(function(received_datapoints) {
							assert.equal(received_datapoints.length, aggregated_datapoints.length);
							deleteSensor(newsensor.suid());

							_.each(received_datapoints, function(dp, i) {
								var dpa = aggregated_datapoints[i];
								assert.equal(dp.timestampMs(), dpa.timestampMs());
								assert.equal(dp.value(), dpa.value());
							});

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
	it('should correctly create sensor, create channel, insert and rollup datapoints into 10 days bins using average aggregator function and delete sensor', function(done) {
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

		var queryDatapoints = function(cuid, start, end, func, interval) {
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
				dfd.reject(error);
			});

			return dfd.promise;
		}

		var aggregate = function(datapoints) {
			var aggregated_datapoints = [];

			var accumulator = 0;
			var pivot = null;
			var interval = 10;

			_.each(datapoints, function(dp, i) {

				if (( (i + 1) % interval) == 1 ) {
					pivot = dp.timestamp();
				}

				if (( (i + 1) % interval) == 0) {
					accumulator += dp.value();
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator / interval
						})
					);
					accumulator = 0;
				} else {
					accumulator += dp.value();
				}

				if (datapoints.length - 1 == i) {
					aggregated_datapoints.push(
						new ibisense.models.DataPoint({
							date: pivot, 
							value: accumulator
						})
					);
				}
			});
			return aggregated_datapoints;
		}

		var deleteSensor = function(suid) {
			ibisense.sensors.remove(suid);
		}

		var cuid  = undefined;

		var num   = 100;  
		var step  = 24 * 60 * 60 * 1000; // 1 day

		var end   = new Date().getTime();
		var start = end - num * step;
		var original_datapoints   = prepareData(start, end + 1, step);
		var aggregated_datapoints = aggregate(original_datapoints);
		var propagation_delay     = 5000; // wait 5 seconds before attempting to read out data
		var func  = "avg";
		var ival  = "10d"; 

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryDatapoints(cuid, start, end, func, ival))
						.then(function(received_datapoints) {
							assert.equal(received_datapoints.length, aggregated_datapoints.length);
							deleteSensor(newsensor.suid());

							_.each(received_datapoints, function(dp, i) {
								var dpa = aggregated_datapoints[i];
								assert.equal(dp.timestampMs(), dpa.timestampMs());
								assert.equal(dp.value(), dpa.value());
							});

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

describe('Add and get last values:', function() {
	it('should correctly create sensor, create channel, insert and get last inserted datapoint, and delete sensor', function(done) {
		this.timeout(180000);

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

		var queryLastDatapoint = function(cuid) {
			var dfd = when.defer();
			ibisense.datapoints.getLast(cuid, function(dataset) {
				if (dataset.datapoints().length == 0) {
					dfd.resolve();
				} else {
					var last_dp = dataset.datapoints()[0];
					dfd.resolve(last_dp);
				}
				
			}, function(error) {
				dfd.reject(error);
			});

			return dfd.promise;
		}

		var getLast = function(dps) {
			var last_idnex = dps.length - 1;
			return dps[last_idnex];
		}

		var deleteSensor = function(suid) {
			ibisense.sensors.remove(suid);
		}

		var cuid  = undefined;

		var num   = 100;  
		var step  = 24 * 60 * 60 * 1000; // 1 day
		var end   = new Date().getTime();
		var start = end - num * step;
		var original_datapoints   = prepareData(start, end + 1, step);
		var propagation_delay     = 5000; // wait 5 seconds before attempting to read out data

		when(createNewSensor(newsensor)).then(function(sensor) {
			newsensor = sensor;
			when(createNewChannel(newsensor.suid(), newchannel))
				.then(function(created_channel) {
				newchannel = created_channel;
				cuid = newchannel.cuid();
				when(addDatapoints(cuid, original_datapoints))
					.then(function(received_datapoints) {
					setTimeout(function() {
						when(queryLastDatapoint(cuid))
						.then(function(last_dp) {
							assert.equal(last_dp.timestampMs(), getLast(original_datapoints).timestampMs());
							assert.equal(last_dp.value(), getLast(original_datapoints).value());
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
