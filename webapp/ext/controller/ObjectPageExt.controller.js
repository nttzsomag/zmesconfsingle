sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
  "use strict";

  return ControllerExtension.extend("zmesconfsingle.zmesconfsingle.ext.controller.ObjectPageExt", {
    override: {
      onInit: function () {
        var oView = this.getView();
        var sTableId = "zmesconfsingle.zmesconfsingle::OperationObjectPage--fe::table::_AppNav::LineItem";
        var oTable = oView.byId(sTableId) || sap.ui.getCore().byId(sTableId);

        if (oTable) {
          oTable.attachRowPress(this._onRowPress.bind(this));
        } else {
          console.warn("Table not found:", sTableId);
        }
      }
    },

    _onRowPress: function (oEvent) {
      var oBindingContext = oEvent.getParameter("bindingContext");
      if (!oBindingContext) return;

      oBindingContext.requestProperty(["ToSemObj", "ToSemAction"])
        .then(function (aValues) {
          var sToSemObj = aValues[0];
          var sToSemAction = aValues[1];

          if (sToSemObj && sToSemAction) {
            sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
              target: {
                semanticObject: sToSemObj,
                action: sToSemAction
              }
            });
          }
        });
    }
  });
});