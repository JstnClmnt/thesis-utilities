var fs = require('fs'),
	ytdl = require('ytdl-core')
	url = require('url'),
	sprintf = require('sprintf-js').sprintf,
	DataFrame = require('dataframe-js').DataFrame,
	request = require('request'),
	progress = require('request-progress'),
	ProgressBar = require('progress'),
	ora = require('ora');

const ROOT_DIR = "gestures";

if(!fs.existsSync(ROOT_DIR)) {
	fs.mkdirSync(ROOT_DIR);
}

DataFrame.fromCSV("http://localhost:8080/dataset.csv", true)
	.then(df => {

		async function startDownload() {
			var rows = df.sortBy(['gesture', 'actor']).toCollection();

			console.log(sprintf("Starting downloads. %d videos in queue.", rows.length));

			var prevGesture = null, clipCtr = null, rowCtr = 1;
			for (row of rows) {
				if (prevGesture !== row.gesture) {
					prevGesture = row.gesture;
					clipCtr = 1;
				}

				var path = getPath(row, clipCtr),
					filename = getFilename(row, clipCtr),
					promise = null;

				createDirectory(row);

				switch(url.parse(row.link).host) {
					case 'youtube.com': case 'youtu.be': {
						promise = ytdlPromise(row.link, path);
						break;
					}

					default: {
						promise = downloadPromise(row.link, path);
						break;
					}
				}
				var spinner = ora(sprintf("[%d/%d] Downloading video from %s", rowCtr, rows.length, row.link));
				spinner.start();
				await promise;
				spinner.succeed(sprintf("[%d/%d] Video saved to %s", rowCtr, rows.length, path));
				rowCtr++;
				clipCtr++;
			}

			console.log(sprintf("%d videos were downloaded.", rows.length));
		}

		startDownload();
	});

function getFilename(row, clipNo) {
	return sprintf("%d-%s-%s", clipNo, row.gesture, row.actor);
}

function getPath(row, clipNo) {
	return sprintf("%s/%s/%s.mp4", ROOT_DIR, row.gesture, getFilename(row, clipNo));
}

function createDirectory(row) {
	var dir = sprintf("%s/%s", ROOT_DIR, row.gesture);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}

function downloadPromise(videoUrl, filePath, callback) {
	var promise = new Promise(function(resolve, reject) {
		var video = progress(request(videoUrl));

		video.pipe(fs.createWriteStream(filePath));

		video.on('error', function(err) {
			reject(err);
		});

		video.on('end', function() {
			resolve(filePath);
		});
	});

	if (!callback) {
		return promise;
	}

	promise.then(res => { callback(res) });
}

function ytdlPromise(videoUrl, filePath, callback) {
	var promise = new Promise(function(resolve, reject) {
		var video = ytdl(videoUrl, { filter: (format) => format.container === 'mp4' });
		
		video.pipe(fs.createWriteStream(filePath));

		video.on("progress", function(chunkLength, downloaded, total) {
			if (downloaded === total) {
				resolve(filePath);
			}
		});
	});

	if (!callback) {
		return promise;
	}

	promise.then(res => { callback(res) });
}