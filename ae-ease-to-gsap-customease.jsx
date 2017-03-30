// This script currently can't automatically determine FPS, just change this number for now.

// This script also currently ONLY WORKS ON WINDOWS due to the copyTextToClipboard function
// being hardcoded for windows only. If not on windows, you'll need to edit this script to disable
// the clipboard functionality and probably copy the output directly from the ExtendScript IDE.
(function () {
	'use strict';

	var framerate = 60;

	var curItem = app.project.activeItem;
	var selectedLayers = curItem.selectedLayers;
	var selectedProperties = app.project.activeItem.selectedProperties;
	if (selectedLayers == 0) { // eslint-disable-line eqeqeq
		alert('Please Select at least one Layer');
		return;
	}

	if (selectedProperties == 0) { // eslint-disable-line eqeqeq
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
			var curveStartValue = currentProperty.keyValue(1)[0];
			var path = 'M' + curveStartFrame.toFixed(3) + ',' + curveStartValue.toFixed(3);

			var m;
			var b;
			var x;
			var y;

			for (i = 1; i < currentProperty.numKeys; i++) {
				var data = calcData(currentProperty, i, i + 1);

				// Outgoing control point
				var outgoingEase = currentProperty.keyOutTemporalEase(i);
				var outgoingSpeed = outgoingEase[0].speed;
				var outgoingInfluence = outgoingEase[0].influence / 100;

				m = outgoingSpeed / framerate; // Slope
				b = data.startValue - data.endValue; // Y-intercept
				x = data.durationFrames * outgoingInfluence;
				y = (m * x) + b;

				$.writeln('Outgoing CP: ' + (data.startFrame + x) + ', ' + (data.endValue + y));
				path += 'C' + cleanNumber(data.startFrame + x) + ',' + cleanNumber(data.endValue + y);

				// Incoming control point
				var incomingEase = currentProperty.keyInTemporalEase(i + 1);
				var incomingSpeed = incomingEase[0].speed;
				var incomingInfluence = incomingEase[0].influence / 100;

				m = Math.abs(incomingSpeed) / framerate; // Slope
				b = data.endValue; // Y-intercept
				x = data.durationFrames * incomingInfluence;
				y = (m * x) + b;

				$.writeln('Incoming CP: ' + (data.endFrame - x) + ', ' + y);
				path += ',' + cleanNumber(data.endFrame - x) + ',' + cleanNumber(y);

				// End anchor point
				path += ',' + cleanNumber(data.endFrame) + ',' + cleanNumber(data.endValue);

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

	function calcData(property, startIndex, endIndex) {
		var startTime = property.keyTime(startIndex);
		var endTime = property.keyTime(endIndex);
		var durationTime = endTime - startTime;

		var startFrame = startTime * framerate;
		var endFrame = endTime * framerate;
		var durationFrames = endFrame - startFrame;

		var startValue = property.keyValue(startIndex)[0];
		var endValue = property.keyValue(endIndex)[0];

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
		var cmdString = 'cmd.exe /c cmd.exe /c "echo ' + str + ' | clip"';
		system.callSystem(cmdString);
	}
})();
