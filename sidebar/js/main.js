import Polyglot from 'node-polyglot';

const storage = browser.storage;
const tabs = browser.tabs;
const polyglot = new Polyglot();

polyglot.extend({
  "num_tabs": "%{smart_count} tab |||| %{smart_count} tabs",
});


class TabSweeperSideBar {
    constructor() {
        this.sessions = [];
        this.sessionContainer = document.querySelector("#session-container");
        this.clearAll = document.querySelector("button#clearall");
        this.timeoutId;

        this.tags = {
            DIV: "div",
            SPAN: "span",
            TABLE: "table",
            TR: "tr",
            TD: "td",
            BUTTON: "button",
            A: "a"
        };

        // clear all session data
        this.clearAll.addEventListener("click", () => this.clearSessionData());
        tabs.onRemoved.addListener(() => this.refresh());

        this.render();
    }

    /*
     * Initialize the page with any saved sessions
     */
    render() {
        this.getSavedSessions()
        .then(result => this.outputSessions(result))
        .catch(e => console.error(e));
    }

    /*
     * iterate over sessions and display them
     */
    outputSessions() {
        if (!this.sessions || !this.sessions.length) {
            // TODO: display message about no sessions
            return;
        }

        this.sessions.forEach(this.outputSessionUrls, this);
    }

    /*
     * get sessions from local storage
     */
    getSavedSessions() {
        return storage.local.get()
        .then(result => {
            this.sessions = result.sessions
        });
    }

    /*
     * refresh the sidebar
     */
    refresh() {
        // debounce!
        if (this.timeoutId) {
            window.clearTimeout(this.timeoutId);
        }

        this.timeoutId = window.setTimeout(() => {
            this.clearSessionContainer()
            .then(() => this.getSavedSessions())
            .then(() => this.render())
            .catch(e => console.error(e))
        }, 25);
    }

    /*
     * Clear all Session data
     */
    clearSessionData() {
        storage.local.set({sessions: []})
        .then(() => this.refresh())
        .catch(e => console.error(e));
    }

    /*
     * empty sessionContainer
     */
    clearSessionContainer() {
        return new Promise((resolve, reject) => {
            let container = this.sessionContainer;
            while(container.firstChild) {
                container.removeChild(container.firstChild);
            }
            resolve();
        });
    }

    /*
     * Format Date for display (M-D-YYYY h:m A)
     *
     */
    formatDate(created) {
        let date = new Date(created);
        let month = ("0"+ (date.getMonth() + 1)).slice(-2);
        let day = ("0" + date.getDate()).slice(-2);
        let year = date.getFullYear();
        let hours = ("0" + date.getHours()).slice(-2);
        let minutes = ("0" + date.getMinutes()).slice(-2);

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    }

    /*
     * Restore a tabs in a session
     */
    restoreTab(tab) {
        tabs.create({
            url: tab.url
        });
    }

    /*
     * Restore all tabs in a session
     */
    restoreSession(session) {
        session.tabs.forEach(tab => this.restoreTab(tab));
    }

    /*
     * Build a session panel
     */
     createSessionPanel(pluralized, created, session) {
        let urlPanel = document.createElement(this.tags.DIV);
        let panelHeading = document.createElement(this.tags.DIV);
        let urlTable = document.createElement(this.tags.TABLE);
        let restoreAllBtn = document.createElement(this.tags.BUTTON);

        // panel classes
        urlPanel.classList.add("panel", "panel-default");

        // heading classes and text
        panelHeading.classList.add("panel-heading");
        panelHeading.textContent = `${pluralized} - ${created}`;

        // table classes
        urlTable.classList.add("table", "table-responsive");

        // button classes
        restoreAllBtn.classList.add("btn", "btn-primary", "btn-xs");
        restoreAllBtn.textContent = "Restore Session";
        restoreAllBtn.addEventListener("click", () => this.restoreSession(session));

        // append panel heading and table to the panel
        panelHeading.appendChild(restoreAllBtn);
        urlPanel.appendChild(panelHeading);
        urlPanel.appendChild(urlTable);

        return {
            urlPanel,
            urlTable
        };
     }

    /*
     * Build a tab
     */
    createTab(session, tab, tabIndex, sessionIndex, urlTable) {
        let urlTableRow = document.createElement(this.tags.TR);
        let urlTableData = document.createElement(this.tags.TD);
        let closeBtn = document.createElement(this.tags.BUTTON);
        let closeSpan = document.createElement(this.tags.SPAN);
        let anchor = document.createElement(this.tags.A)

        // set up close button
        closeBtn.classList.add("close");
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.addEventListener("click", () => {
            this.removeTab(session, tabIndex, sessionIndex)
        });

        // add the "X" to the span
        closeSpan.innerHTML = "&times;";

        // set up the tab anchor
        anchor.setAttribute("href", "#");
        anchor.textContent = tab.url;
        anchor.addEventListener("click", () => this.restoreTab(tab));

        // put everything together
        closeBtn.appendChild(closeSpan);
        urlTableData.appendChild(closeBtn);
        urlTableData.appendChild(anchor)
        urlTableRow.appendChild(urlTableData)
        urlTable.appendChild(urlTableRow);
    }

    /*
     * Output a single session's URLs
     */
    outputSessionUrls(session, sessionIndex) {
        let created = this.formatDate(session.created);
        let pluralized = polyglot.t("num_tabs", {
            smart_count: session.tabs.length
        });

        let {
            urlPanel,
            urlTable
        } = this.createSessionPanel(pluralized, created, session);

        session.tabs.forEach((tab, index) => {
            this.createTab(session, tab, index, sessionIndex, urlTable)
        });

        this.sessionContainer.appendChild(urlPanel);
    }

    removeTab(session, index, sessionIndex) {
        session.tabs.splice(index, 1);

        if (session.tabs.length) {
            this.sessions[sessionIndex] = session;
        } else {
            this.sessions.splice(sessionIndex, 1);
        }

        this.saveSessions()
        .then(() => this.refresh())
        .catch(e => console.error(e));
    }

    /*
     * save sessions to local storage
     */
    saveSessions() {
        let sessions = this.sessions;
        return storage.local.set({sessions});
    }
}

let tabSweeperSideBar = new TabSweeperSideBar();
