(function iife() {
  const WS_URL = "ws://localhost:8080/";

  let socket;
  let store;
  let inventoryComponent;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, false);
  } else {
    init();
  }

  function init() {
    try {
      store = Store();
      inventoryComponent = InventoryComponent(store);
      setupWebSocket();
    } catch (error) {
      console.error("ERROR: ", error);
      if (socket) {
        socket.close();
      }
    }
  }

  function setupWebSocket() {
    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", onError);
  }

  function onOpen() {
    console.log("WS open");
  }

  function onMessage(event) {
    // for this we assume the parsed data is an object `{store, model, inventory}`
    const inventoryItem = JSON.parse(event.data);

    store.save(inventoryItem);

    // for every new message iterate all items and only
    // render new items or existing items with changed inventory
    inventoryComponent.render(store.getInventory());
  }

  function onError(event) {
    console.error("ERROR: ", event.error);
  }

  function InventoryComponent(store) {
    let componentEl;

    function tableExists() {
      return !!componentEl.querySelector(".inventory__table");
    }

    function buildTable() {
      const tableEl = `<table class="inventory__table">
        <caption>Inventory</caption>
        <thead>
          <tr>
            <th>Store</th>
            <th>Model</th>
            <th>Inventory</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>`;

      componentEl.insertAdjacentHTML("beforeEnd", tableEl);
      renderRows();
    }

    function renderRows() {
      const tableBodyEl = document.querySelector(".inventory__table tbody");

      store.getInventory().forEach((item) => {
        const { key, store, model, inventory } = item;
        const rowEl = document.querySelector(`#${key}`);

        const rowCols = `<td>${store}</td><td>${model}</td>${inventoryCol(
          inventory
        )}`;

        if (!rowEl) {
          tableBodyEl.insertAdjacentHTML(
            "afterbegin",
            `<tr id="${key}" data-inventory="${inventory}">${rowCols}</tr>`
          );
        } else {
          const rowInventory = rowEl.dataset.inventory;
          if (+rowInventory !== inventory) {
            rowEl.dataset.inventory = inventory;
            rowEl.innerHTML = rowCols;
          }
        }
      });
    }

    function inventoryCol(value) {
      if (value < 5) {
        return `<td class="inventory__table--risk">${value}</td>`;
      } else if (value < 15) {
        return `<td class="inventory__table--low">${value}</td>`;
      }
      return `<td>${value}</td>`;
    }

    function render() {
      componentEl = document.querySelector(".inventory");

      if (!tableExists()) {
        buildTable();
      } else {
        renderRows();
      }
    }

    return {
      render,
    };
  }

  function Store() {
    const inventoryMap = new Map();
    const stores = new Set();
    const models = new Set();

    function save({ store, model, inventory }) {
      const key = buildKey(store, model);

      inventoryMap.set(key, { store, model, inventory });

      updateStores(store);
      updateModels(model);
    }

    function updateStores(store) {
      stores.add(store);
    }

    function updateModels(model) {
      models.add(model);
    }

    /**
     * It returns the inventory as an array
     *
     * @returns [{key, store, model, inventory}]
     */
    function getInventory() {
      const result = [];
      inventoryMap.forEach((item, key) => {
        result.push({ key, ...item });
      });

      return result;
    }

    function getStores() {
      return [...stores];
    }

    function getModels() {
      return [...models];
    }

    function buildKey(store, model) {
      let key = store.replace(/\s+/g, "_");
      return `${key}-${model}`;
    }

    return {
      save,
      getInventory,
      getStores,
      getModels,
    };
  }
})();
