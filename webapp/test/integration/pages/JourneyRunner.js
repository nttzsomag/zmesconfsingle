sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"zmesconfsingle/zmesconfsingle/test/integration/pages/OperationObjectPage.gen"
], function (JourneyRunner, OperationObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('zmesconfsingle/zmesconfsingle') + '/test/flp.html#app-preview',
        pages: {
			onTheOperationObjectPageGenerated: OperationObjectPageGenerated
        },
        async: true
    });

    return runner;
});

