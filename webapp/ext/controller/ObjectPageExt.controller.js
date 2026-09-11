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
        this._attachHeaderButtonPress("Karbantartási utasítás", "sap-icon://wrench", this.onShowMaintenanceInstruction);
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

    // ====== Karbantartási utasítás - berendezéshez (EQUI) kötve ======
    onShowMaintenanceInstruction: function () {
      var oView = this.getView();
      var oContext = oView.getBindingContext();
      if (!oContext) {
        console.warn("### DEBUG: onShowMaintenanceInstruction - nincs binding context");
        return;
      }

      var oModel = oContext.getModel();
      var oEquipmentBinding = oModel.bindList(oContext.getPath() + "/_Equipment", undefined, undefined, undefined, {
        $select: "EquiEqunr"
      });

      oEquipmentBinding.requestContexts().then(function (aContexts) {
        var aEquipmentIds = aContexts
          .map(function (oCtx) {
            var sVal = oCtx.getProperty("EquiEqunr");
            return sVal ? ("000000000000000000" + sVal).slice(-18) : sVal;
          })
          .filter(Boolean);

        console.log("### DEBUG: onShowMaintenanceInstruction - equipment ID-k:", aEquipmentIds);

        if (!aEquipmentIds.length) {
          MessageToast.show("Nincs berendezés rendelve ehhez a munkahelyhez.");
          return;
        }

        var oEquipmentFilter = new Filter({
          filters: aEquipmentIds.map(function (sEquipmentId) {
            return new Filter("BoObjKey", "EQ", sEquipmentId);
          }),
          and: false
        });

        this._showGosDocumentsDialog(oView, [
          new Filter("BoObjType", "EQ", "EQUI"),
          oEquipmentFilter
        ], "Karbantartási utasítás");
      }.bind(this)).catch(function (oError) {
        console.log("### DEBUG: hiba a berendezések lekérésekor:", oError);
      });
    }
  });
});