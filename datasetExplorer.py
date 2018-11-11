import os

def buildGestureDict(path):
	if os.path.isdir(path):
		gestureDict = {}

		for item in os.listdir(path):
			subpath = os.path.join(path, item)
			if (os.path.isdir(subpath)):
				gesture = gestureDict[item] = {
					'videos': []
				}

				for item in os.listdir(subpath):
					if (item.lower().endswith('.mp4')):
						split = item.split('-')
						video = {
							'filepath': os.path.join(subpath, item), # with respect to the path argument
							'filename': item,
							'no': int(split[0]),
							'gesture': split[1],
							'actor': split[2].split('.')[0]
						}

						gesture['videos'].append(video)

		return gestureDict