let tasks = null;

function loadData() {
    $.ajax({
        url: '/api/getTasksForToday',
        dataType: 'json',
        success: (data) => {
            tasks = data;
            renderTasks();
        }
    });
}

loadData();

function renderTasks() {
    $('#content').empty();

    for (let task of tasks) {
        let isChecked = !!task.value;
        let textColor = isChecked ? 'text-primary text-decoration-line-through' : 'text-body';
        let iconColor = isChecked ? 'text-primary' : 'text-body';
        let taskElement = $(`
            <div class="form-check form-control-lg">
                <input class="form-check-input" type="checkbox" value="" id="${task.id}"${isChecked ? ' checked' : ''}>
                <label class="form-check-label d-flex" for="${task.id}">
                    <div class="d-flex align-items-center justify-content-center me-1" style="width: 30px"><i class="${iconColor} ${task.icon}"></i></div>
                    <div class="${textColor}">${task.name}</div>
                </label>
            </div>
        `);

        let checkbox = taskElement.find('input');
        checkbox.change(function() {
            setTaskValue(this.id, !!this.checked);
            renderTasks();
        });

        $('#content').append(taskElement);
    }
}

function setTaskValue(id, value) {
    let serializedData = JSON.stringify([[id, value]]);
    let task = tasks.find(task => task.id === id);

    if (task) {
        task.value = value;
    }

    $.ajax({
        url: '/api/setTasksForToday',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: serializedData,
        success: (response) => {}
    });
}