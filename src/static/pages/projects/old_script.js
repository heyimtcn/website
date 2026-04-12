/** @type {HTMLDivElement} */
const sidebar = document.querySelector("#sidebar");
/** @type {HTMLDivElement} */
const sidebar_toggle = document.querySelector("#sidebar_toggle");

sidebar_toggle.addEventListener("click",ev => {
    if (!sidebar.hasAttribute("data-visible")) {
        sidebar.setAttribute("data-visible","");
    } else {
        sidebar.removeAttribute("data-visible");
    }
});