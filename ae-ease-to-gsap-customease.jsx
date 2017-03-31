(function () {
	'use strict';

	var curItem = app.project.activeItem;
	var framerate = curItem.frameRate;
	var selectedLayers = curItem.selectedLayers;
	var selectedProperties = curItem.selectedProperties;

	if (selectedLayers.length === 0) {
		alert('Please Select at least one Layer');
		return;
	}

	if (selectedProperties.length === 0) {
		alert('Please Select at least one Property (Scale, Opacity, etc)');
		return;
	}

	for (var i = 0; i < selectedLayers.length; i++) {
		for (var f in selectedProperties) {
			if (!{}.hasOwnProperty.call(selectedProperties, f)) {
				continue;
			}

			var currentProperty = selectedProperties[f];
			if (currentProperty.numKeys <= 1) {
				continue;
			}

			var curveStartFrame = currentProperty.keyTime(1) * framerate;
			var curveStartValue;

			if (currentProperty.value instanceof Array) {
				curveStartValue = currentProperty.keyValue(1)[0];
			} else {
				curveStartValue = currentProperty.keyValue(1);
			}

			// The path data we output is in SVG path format: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
			// Moves the drawing pen to the start point of the path.
			var path = 'M' + cleanNumber(curveStartFrame) + ',' + cleanNumber(curveStartValue);

			for (i = 1; i < currentProperty.numKeys; i++) {
				var tweenData = calcTweenData(currentProperty, i, i + 1);
				var easeType = calcEaseType(currentProperty, i, i + 1);
				$.writeln('easeType: ' + easeType);

				// For linear eases, just draw a line. (L x y)
				if (easeType === 'linear-linear') {
					path += 'L' + cleanNumber(tweenData.endFrame) + ',' + cleanNumber(tweenData.endValue);
					continue;
				}

				if (easeType === 'unsupported') {
					$.writeln('UNSUPPORTED EASING PAIR!');
					alert('This keyframe pair uses an unsupported pair of ease types, results may be inaccurate.');
				}

				path += 'C' + calcOutgoingControlPoint(tweenData, currentProperty, i);
				path += ',' + calcIncomingControlPoint(tweenData, currentProperty, i);
				path += ',' + cleanNumber(tweenData.endFrame) + ',' + cleanNumber(tweenData.endValue);

				$.writeln();
			}

			$.writeln(path);
			$.writeln();
			$.writeln();
			copyTextToClipboard(path);
			alert('Copied to clipboard:\n' + path +
				'\n\nPaste directly into a GSAP CustomEase, like:\n' +
				'CustomEase.create(\'myCustomEase\', \'' + path + '\');' +
				'\n\nMore info: https://greensock.com/docs/#/HTML5/GSAP/Easing/CustomEase/');
		}
	}

	function calcTweenData(property, startIndex, endIndex) {
		var startTime = property.keyTime(startIndex);
		var endTime = property.keyTime(endIndex);
		var durationTime = endTime - startTime;

		var startFrame = startTime * framerate;
		var endFrame = endTime * framerate;
		var durationFrames = endFrame - startFrame;

		var startValue;
		var endValue;

		if (property.value instanceof Array) {
			startValue = property.keyValue(startIndex)[0];
			endValue = property.keyValue(endIndex)[0];
		} else {
			startValue = property.keyValue(startIndex);
			endValue = property.keyValue(endIndex);
		}

		return {
			startTime: startTime,
			endTime: endTime,
			durationTime: durationTime,
			startFrame: startFrame,
			endFrame: endFrame,
			durationFrames: durationFrames,
			startValue: startValue,
			endValue: endValue
		};
	}

	function cleanNumber(num) {
		return parseFloat(num.toFixed(4));
	}

	// From https://forums.adobe.com/message/9157695#9157695
	function copyTextToClipboard(str) {
		var cmdString;
		if ($.os.indexOf('Windows') === -1) {
			cmdString = 'echo "' + str + '" | pbcopy';
		} else {
			cmdString = 'cmd.exe /c cmd.exe /c "echo ' + str + ' | clip"';
		}

		system.callSystem(cmdString);
	}

	function calcEaseType(property, startIndex, endIndex) {
		var startInterpolation = property.keyOutInterpolationType(startIndex);
		var endInterpolation = property.keyInInterpolationType(endIndex);

		if (startInterpolation === KeyframeInterpolationType.LINEAR &&
			endInterpolation === KeyframeInterpolationType.LINEAR) {
			return 'linear-linear';
		}

		if (startInterpolation === KeyframeInterpolationType.LINEAR &&
			endInterpolation === KeyframeInterpolationType.BEZIER) {
			return 'linear-bezier';
		}

		if (startInterpolation === KeyframeInterpolationType.BEZIER &&
			endInterpolation === KeyframeInterpolationType.LINEAR) {
			return 'bezier-linear';
		}

		if (startInterpolation === KeyframeInterpolationType.BEZIER &&
			endInterpolation === KeyframeInterpolationType.BEZIER) {
			return 'bezier-bezier';
		}

		return 'unsupported';
	}

	function calcOutgoingControlPoint(tweenData, property, keyIndex) {
		var outgoingEase = property.keyOutTemporalEase(keyIndex);
		var outgoingSpeed = outgoingEase[0].speed;
		var outgoingInfluence = outgoingEase[0].influence / 100;

		var m = outgoingSpeed / framerate; // Slope
		var x = tweenData.durationFrames * outgoingInfluence;
		var b = tweenData.startValue; // Y-intercept
		var y = (m * x) + b;

		var correctedX = cleanNumber(tweenData.startFrame + x);
		var correctedY = cleanNumber(y);
		$.writeln('Outgoing CP: ' + correctedX + ',' + correctedY);
		return correctedX + ',' + correctedY;
	}

	function calcIncomingControlPoint(tweenData, property, keyIndex) {
		var incomingEase = property.keyInTemporalEase(keyIndex + 1);
		var incomingSpeed = incomingEase[0].speed;
		var incomingInfluence = incomingEase[0].influence / 100;

		var m = Math.abs(incomingSpeed) / framerate; // Slope
		var x = tweenData.durationFrames * incomingInfluence;
		var b = tweenData.endValue; // Y-intercept
		var y = (m * x) + b;

		var correctedX = cleanNumber(tweenData.endFrame - x);
		var correctedY = cleanNumber(y);
		$.writeln('Incoming CP: ' + correctedX + ', ' + correctedY);
		return correctedX + ',' + correctedY;
	}
})();
