/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"com/lycra_beams/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
