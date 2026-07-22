sap.ui.define(
    ["sap/fe/core/AppComponent", "sap/ui/model/Filter"],
    function (Component, Filter) {
        "use strict";

        return Component.extend("zmesconfsingle.zmesconfsingle.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);

                const oStartupParams = this.getComponentData()?.startupParameters;

                if (oStartupParams?.ManufacturingOrder && oStartupParams?.ManufacturingOrderOperation) {

                    const sOrder = oStartupParams.ManufacturingOrder[0];
                    const sOper  = oStartupParams.ManufacturingOrderOperation[0];

                    const oModel = this.getModel();

                    const oBinding = oModel.bindList("/Operation", null, [], [
                        new Filter("ManufacturingOrder", "EQ", sOrder),
                        new Filter("ManufacturingOrderOperation", "EQ", sOper)
                    ]);

                    oBinding.requestContexts(0, 1).then((aContexts) => {
                        if (aContexts.length > 0) {
                            const oData = aContexts[0].getObject();

                            const sHash =
                                `Operation(ManufacturingOrder='${oData.ManufacturingOrder}',` +
                                `ManufacturingOrderSequence='${oData.ManufacturingOrderSequence}',` +
                                `ManufacturingOrderOperation='${oData.ManufacturingOrderOperation}',` +
                                `RelevantWorkCenterID='${oData.RelevantWorkCenterID}')`;

                            this.getRouter().getHashChanger().replaceHash(sHash);
                        }
                    });
                }
            },

            /**
             * Gets the component startup parameters, setting preferredMode to 'create'.
             * @public
             * @returns 
             */
            getStartupParameters: function() {
                return Promise.resolve({
                    preferredMode: ["create"]
                });
            }
        });
    }
);