// State variables
let tasks = null;
let isRefreshing = false;
let lastTimeRefreshed = null;
let automaticRefreshInterval = 10 * 1000; // 10 seconds
let renderedTasks = null;

// Call the database and get the updated list of tasks and if they're checked or not
function refresh() {
    isRefreshing = true;

    $.ajax({
        url: '/api/getTasksForToday',
        dataType: 'json',
        success: (data) => {
            isRefreshing = false;
            lastTimeRefreshed = new Date();
            console.log(`Refreshed at ${lastTimeRefreshed}`);
            tasks = data;
            renderTasks();
        }
    });
}

function renderNumberInput(task) {
    let element = $(`
        <div class="col-12 d-flex align-items-center">
            <input type="number" class="form-control form-control-lg" style="width: 100px">
            <label class="ms-2 col-form-label col-form-label-lg">${task.suffix}</span>
        </div>
    `);

    let input = element.find('input');
    if (task.value != null) {
        input.val(task.value);
    }

    input.change(function() {
        let valid = false;

        if (this.value !== '') {
            let asNumber = parseFloat(this.value);
            if (!isNaN(asNumber) && isFinite(asNumber)) {
                if (task.min != null && asNumber < task.min) {
                    asNumber = task.min;
                } else if (task.max != null && asNumber > task.max) {
                    asNumber = task.max;
                }

                if (task.roundTo != null) {
                    asNumber = Math.round(asNumber / task.roundTo) * task.roundTo;
                }

                if (task.decimalPlaces != null) {
                    this.value = asNumber.toFixed(task.decimalPlaces);
                } else {
                    this.value = asNumber.toString();
                }

                if ((task.autoCompleteMax != null && asNumber >= task.autoCompleteMax) || (task.autoCompleteValidValue)) {
                    setTaskValue(task.id, true, this.value);
                    renderTasks();
                }

                valid = true;
            }
        }

        if (valid) {
            setTaskValue(task.id, task.completed, this.value);
        }
    });

    return element;
}

function renderCheckbox(task) {
    let isChecked = !!task.completed;
    let textColor = isChecked ? 'text-primary text-decoration-line-through' : 'text-body';
    let iconColor = isChecked ? 'text-primary' : 'text-body';
    let checkedAttribute = isChecked ? 'checked' : '';

    let element = $(`
    <div class="col-12">
        <div class="form-check form-control-lg">
            <input class="form-check-input" type="checkbox" value="" id="${task.id}" ${checkedAttribute}>
            <label class="form-check-label d-flex" for="${task.id}">
                <div class="d-flex align-items-center justify-content-center me-1" style="width: 30px"><i class="${iconColor} ${task.icon}"></i></div>
                <div class="${textColor}">${task.name}</div>
            </label>
        </div>
    </div>
    `);

    // Attach change handler. We want to save the value to the database whenever the checkbox state changes
    let checkbox = element.find('input');
    checkbox.change(function() {
        setTaskValue(task.id, !!this.checked, task.value);
        renderTasks();
    });

    return element;
}

// Render the content for tasks. Automatically quits if nothing has changed
function renderTasks() {
    if (!_.isEqual(tasks, renderedTasks)) {
        $('#content').empty();

        for (let task of tasks) {
            let taskElement = $('<div class="row row-cols-lg-auto align-items-center"></div>');
            let checkbox = renderCheckbox(task);
            taskElement.append(checkbox);

            if (task.type === 'number') {
                let numberInput = renderNumberInput(task);
                taskElement.append(numberInput);
            }

            $('#content').append(taskElement);
        }

        // Save the state of what we've rendered so we know when we can skip rendering
        renderedTasks = _.cloneDeep(tasks);
    } else {
        console.log('Skipping re-render, content is unchanged');
    }
}

// Run every frame the page is open
function onAnimationFrame() {
    // Refresh the page content every X seconds to pull in changes from other clients
    if (!isRefreshing && lastTimeRefreshed !== null && new Date().getTime() - lastTimeRefreshed.getTime() >= automaticRefreshInterval) {
        refresh();
    }

    requestAnimationFrame(onAnimationFrame);
}

// Call the database and set the value of a specific task.
function setTaskValue(id, completed, value) {
    let data = {
        completed,
        value
    }
    let serializedData = JSON.stringify([[id, data]]);
    let task = tasks.find(task => task.id === id);

    if (task) {
        task.completed = completed;
        task.value = value;
    }

    $.ajax({
        url: '/api/setTasksForToday',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: serializedData
    });
}

// Execute some code as soon as possible after starting the page load
$(document).ready(() => {
    refresh();
    requestAnimationFrame(onAnimationFrame);
});
