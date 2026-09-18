sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Table",
  "sap/m/Column",
  "sap/m/ColumnListItem",
  "sap/m/ObjectIdentifier",
  "sap/m/Button",
  "sap/m/Text",
  "sap/ui/model/Filter"
], function (ControllerExtension, MessageToast, Dialog, Table, Column, ColumnListItem, ObjectIdentifier, Button, Text, Filter) {
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

        this._attachHeaderButtonPress("Műszaki rajz", "sap-icon://attachment", this.onShowGosDocuments);
        this._attachHeaderButtonPress("Mérési eredmények rögzítése", "sap-icon://inspection", this.onNavigateToInspectionOperation);
      }
    },

    // ====== Fejléc-gomb megkeresése szöveg alapján, ikon + press bekötése ======
    _attachHeaderButtonPress: function (sButtonText, sIcon, fnHandler) {
      var oView = this.getView();
      var oButton = null;

      sap.ui.core.Element.registry.forEach(function (oElement) {
        if (
          oElement.isA &&
          oElement.isA("sap.m.Button") &&
          oElement.getId().indexOf(oView.getId()) === 0 &&
          oElement.getText &&
          oElement.getText() === sButtonText
        ) {
          oButton = oElement;
        }
      });

      if (oButton) {
        oButton.setIcon(sIcon);
        oButton.attachPress(fnHandler.bind(this));
        console.log("### DEBUG: '" + sButtonText + "' gomb megtalálva és bekötve:", oButton.getId());
      } else {
        console.warn("### DEBUG: '" + sButtonText + "' gomb NEM található onInit-ben");
      }
    },

    // ====== Közös GOS dokumentum-dialógus ======
    _showGosDocumentsDialog: function (oSourceControl, aFilters, sDialogTitle) {
      var oTable = new Table({
        columns: [
          new Column({ header: new Text({ text: "Leírás" }) }),
          new Column({ header: new Text({ text: "Létrehozva" }) })
        ]
      });

      oTable.bindItems({
        path: "/GosUrlLink",
        model: "gosModel",
        filters: aFilters,
        parameters: {
          $select: "GuidId,Description,CreatedOn,Url"
        },
        template: new ColumnListItem({
          type: "Active",
          press: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("gosModel");
            var sUrl = oCtx.getProperty("Url");
            window.open(sUrl, "_blank");
          },
          cells: [
            new ObjectIdentifier({ title: "{gosModel>Description}" }),
            new Text({ text: "{gosModel>CreatedOn}" })
          ]
        }),
        events: {
          dataReceived: function (oEvent) {
            var oData = oEvent.getParameter("data");
            var oErr = oEvent.getParameter("error");
            console.log("[GOS dialog] dataReceived:", oData, "hiba:", oErr);
          }
        }
      });

      var oDialog = new Dialog({
        title: sDialogTitle,
        contentWidth: "30rem",
        content: [oTable],
        beginButton: new Button({
          text: "Bezár",
          press: function () { oDialog.close(); }
        }),
        afterClose: function () { oDialog.destroy(); }
      });

      oSourceControl.addDependent(oDialog);
      oDialog.open();
    },

    _onRowPress: function (oEvent) {
      var oBindingContext = oEvent.getParameter("bindingContext");
      if (!oBindingContext) return;

      oBindingContext.requestProperty(["ToSemObj", "ToSemAction", "ToGroupId"])
        .then(function (aValues) {
          var sToSemObj = aValues[0];
          var sToSemAction = aValues[1];
          var sToGroupId = aValues[2];

          if (!sToSemObj || !sToSemAction) return;

          var oNavArgs = {
            target: { semanticObject: sToSemObj, action: sToSemAction }
          };

          if (sToGroupId) {
            oNavArgs.params = { GroupId: sToGroupId };
          }

          sap.ushell.Container.getService("CrossApplicationNavigation").toExternal(oNavArgs);
        });
    },

    // ====== Csatolt dokumentumok - cikkhez kötve ======
    onShowGosDocuments: function () {
      var oView = this.getView();
      var oContext = oView.getBindingContext();

      oContext.requestProperty(["Material", "ProductDocumentNumber"]).then(function (aValues) {
        var sMaterial = aValues[0];
        var sProductDocumentNumber = aValues[1];

        this._showGosDocumentsDialog(oView, [
          new Filter("BoObjType", "EQ", "BUS1001006"),
          new Filter("BoObjKey", "EQ", sMaterial),
          new Filter("DescriptionUpper", "EQ", sProductDocumentNumber)
        ], "Műszaki rajz");
      }.bind(this));
    },

    // ====== Navigálás az Ellenőrzési művelet (ZMESInspectionOperation) appra ======
    onNavigateToInspectionOperation: function () {
      var oView = this.getView();
      var oContext = oView.getBindingContext();

      oContext.requestProperty(["ManufacturingOrder", "ManufacturingOrderOperation"])
        .then(function (aValues) {
          var sManufacturingOrder = aValues[0];
          var sManufacturingOrderOperation = aValues[1];

          return this._getInspectionKeys(sManufacturingOrder, sManufacturingOrderOperation);
        }.bind(this))
        .then(function (oKeys) {
          if (!oKeys || !oKeys.InspectionLot || !oKeys.InspPlanOperationInternalID) {
            MessageToast.show("Nem található ellenőrzési művelet ehhez a tételhez.");
            return;
          }

          var sAppSpecificRoute = "&/InspectionOperations(InspectionLot='" + oKeys.InspectionLot
            + "',InspPlanOperationInternalID='" + oKeys.InspPlanOperationInternalID
            + "',IsActiveEntity=true)";

          sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
            target: {
              semanticObject: "ZMESInspectionOperation",
              action: "manageLineItems"
            },
            appSpecificRoute: sAppSpecificRoute
          });
        })
        .catch(function (oError) {
          console.error("[onNavigateToInspectionOperation] Hiba:", oError);
          MessageToast.show("Hiba történt az ellenőrzési művelet keresése közben.");
        });
    },

    // A zui_mes_insp_oper_v4 service /InspectionOperations entitáshalmazából olvas,
    // ManufacturingOrder + ManufacturingOrderOperation alapján szűrve - ezek a mezők
    // közvetlenül elérhetők a jelenlegi Operation entitáson (az OrderInternalBillOfOperations
    // NEM property ezen az entitáson, ezért azzal nem lehet szűrni innen).
    // A service metadata-ja alapján konfirmálva: InspectionLot és InspPlanOperationInternalID
    // pontosan így hívják magukat ebben a service-ben is (nincs mezőnév-átalakítás).
    // Draft-enabled entitás (van IsActiveEntity), ezért csak az aktív rekordra szűrünk.
    _getInspectionKeys: function (sManufacturingOrder, sManufacturingOrderOperation) {
      var oModel = this.getView().getModel("inspectionModel");
      var oListBinding = oModel.bindList("/InspectionOperations", undefined, undefined, [
        new Filter("ManufacturingOrder", "EQ", sManufacturingOrder),
        new Filter("ManufacturingOrderOperation", "EQ", sManufacturingOrderOperation),
        new Filter("IsActiveEntity", "EQ", true)
      ], {
        $select: "InspectionLot,InspPlanOperationInternalID"
      });

      return oListBinding.requestContexts(0, 1).then(function (aContexts) {
        if (!aContexts.length) {
          return null;
        }
        var oCtx = aContexts[0];
        return {
          InspectionLot: oCtx.getProperty("InspectionLot"),
          InspPlanOperationInternalID: oCtx.getProperty("InspPlanOperationInternalID")
        };
      });
    }
  });
});