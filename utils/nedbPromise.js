function NedbPromise(db) {
	db.persistence.setAutocompactionInterval(300);
	this.db = db
};

NedbPromise.prototype.insert = function(insertData) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.db.insert(insertData, function(err, newDoc) {
			if(err) {
				reject(err);
			} else {
				resolve(newDoc)
			}
		});
	})
};

NedbPromise.prototype.find = function(query) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.db.find(query, function(err, docs) {
			if(err) {
				reject(err);
			} else {
				resolve(docs);
			}
		})
	})
};

NedbPromise.prototype.findSorted = function(query, sort) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.db.find(query).sort(sort).exec(function(err, docs) {
			if(err) {
				reject(err);
			} else {
				resolve(docs);
			}
		})
	})
};

NedbPromise.prototype.findOne = function(select) {
	var self = this;
	return new Promise(function(resolve, reject) { 
		self.db.findOne(select, function(err, docs) {
			if(err) {
				reject(err);
			} else {
				resolve(docs);
			}
		})
	});
}

NedbPromise.prototype.update = function(select, set) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.db.update(select, set, function(err, numReplaced) {
			if(err) {
				reject(err);
			} else {
				resolve(numReplaced)
			}
		});
	});
}

NedbPromise.prototype.findOneSorted = function(sort, select) {
	var self = this;
	return new Promise(function(resolve, reject) { 
		self.db.findOne(select).sort(sort).exec(function(err, docs) {
			if(err) {
				reject(err);
			} else {
				resolve(docs);
			}
		})
	});
}

module.exports = NedbPromise;