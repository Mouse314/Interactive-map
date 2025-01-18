const canvas = document.getElementById("main-map");
const ctx = canvas.getContext("2d");

// ЭЛЕМЕНТЫ ДОКУМЕНТА
// Цвет и линия
const color_el = document.getElementById("color");
const width_el = document.getElementById("width");
const width_output = document.getElementById('rangeValue');
// Режимы карты
const is_map_drag = document.getElementById("is-map-drag");
const is_points = document.getElementById("is-pointing");
const is_draw = document.getElementById("is-draw");
const is_line = document.getElementById("is-lining");
// Контроллеры анимации
const button_prev = document.getElementById("prev");
const button_next = document.getElementById("next");
const button_newday = document.getElementById("newday");
const button_play = document.getElementById("play");
const textbox = document.getElementById("textbox");
const anim_delay = document.getElementById("anim-delay");
const anim_text = document.getElementById("anim-val");
const is_copy_obj_newday = document.getElementById("copy-next-day-checkbox");
const delete_last_day = document.getElementById("delete-last-day");
var day = 0;
var max_day = 0;
// Импорт / Экспорт анимаций и объектов JSON
const export_button = document.getElementById("exportBtn");
const import_button = document.getElementById("importBtn");

// Перетаскивание карты и линий
let map_drag = false;
let line_drag = false;
let prev_x;
let prev_y;

// Положение курсора мыши
let pointer;

// Список объектов карты
var objects = [[]];

// Список трансформаций
var transitions = [[]];

// Глобальное позиционирование карты
var center = [1, -1];
var screen_ratio = canvas.height / canvas.width;
var horizontal_range = 2;
var vertical_range = horizontal_range * screen_ratio;

// Позиционирование и масштаб заднего фона 
var backgroundCenterOffset = [0, 0];
var backgroundSize = 1000;

let current_line = [];

// Мышка
var button_pressed = 0;

// Курсор
var cursor = [false];
var is_overline = false;


// СОБЫТИЯ МЫШИ
canvas.addEventListener("mousedown", function (e) {
    let x = e.offsetX;
    let y = e.offsetY;

    button_pressed = e.button;

    pointer = [x, y];

    map_drag = true;

    // Создаём точку
    if (is_points.checked && button_pressed == 0) {
        // Если не на точке курсор
        if (cursor[0]) {
            line_drag = true;
        }
        else {
            instantiate("point", screenToWorldPoint([e.offsetX, e.offsetY]), [0, 0], color_el.value, width_el.value);
            update_objects(objects[day]);
        }
    }
    // Рисуем линию от руки
    else if (is_draw.checked) {
        current_line = []

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.fillStyle = color_el.value;
        ctx.lineWidth = width_el.value;
        ctx.strokeStyle = color_el.value;
    }
    else if (is_line.checked && button_pressed == 0) {
        // Изменяем существующую линию или начинаем новую
        if (current_line.length == 0) {
            // Изменяем существующую 
            if (cursor[0]){
                line_drag = true;
                // Если растягиваем сегмент
                if (cursor[1] == "overline") {
                    is_overline = true;
                    objects[day][cursor[5][0]][1].splice(cursor[5][1] + 1, 0, screenToWorldPoint([x, y]));
                    // Добавляем перетянутую точку в предыдущий день
                    if (day != 0) {
                        let ind = cursor[5][1] + 1;
                        let left_ind = cursor[5][1];
                        let right_ind = cursor[5][1] + 1;

                        console.log("Левый: " + left_ind);
                        console.log("Правый: " + right_ind);
                        // Пробегаемся по индексам из пердыдущего дня чтобы размешать проекции на сегменты, а не в воздухе
                        while (left_ind > 0 && objects[day - 1][cursor[5][0]][1][left_ind].length > 2  ) {
                            left_ind--;
                            console.log("Ещё налево! " + left_ind);
                        }
                        while (right_ind < objects[day - 1][cursor[5][0]][1].length - 1 && objects[day - 1][cursor[5][0]][1][right_ind].length > 2) {
                            right_ind++;
                            console.log("Ещё направо! " + right_ind);
                        }

                        if (right_ind == objects[day - 1][cursor[5][0]][1].length) right_ind = 0;

                        let projPoint = getProjectionPoint(objects[day - 1][cursor[5][0]][1][left_ind],
                                    objects[day - 1][cursor[5][0]][1][right_ind],
                                    screenToWorldPoint([x, y])
                                );
                        projPoint.push("edited");
                        console.log(projPoint);
                        
                        objects[day - 1][cursor[5][0]][1].splice(ind, 0, projPoint);

                        // Пробегаемся по точкам из анимации и увеличиваем индекс, так как вставили точку и индексы сбились
                        transitions[day].forEach(obj => {
                            // Если точка на линии
                            if (obj[0].length == 2) {
                                if (obj[0][1] >= ind)
                                    obj[0][1]++;
                            }
                        });
                    }
                }
            }
            // Начинаем новую
            else {
                current_line.push(screenToWorldPoint([x, y]));
                instantiate("point", screenToWorldPoint([x, y]), [0, 0], color_el.value, width_el.value);
                objects[day].push(["frontline", current_line, color_el.value, width_el.value]);
                update_objects(objects[day]);
            }
        }
        // Продолжаем рисование области
        else {
            let w_pos = screenToWorldPoint([x, y]);
            current_line.push(w_pos);
            objects[day][objects[day].length - 1][1].push(w_pos);
            objects[day][objects[day].length - 1][1].pop();
            update_objects(objects[day]);
        }
    }

    prev_x = x;
    prev_y = y;
});
canvas.addEventListener("mousemove", function (e) {
    let x = e.offsetX;
    let y = e.offsetY;

    if (!line_drag) update_cursor([e.offsetX, e.offsetY]);

    // Перетаскивание карты
    if ((is_map_drag.checked && map_drag) || (button_pressed == 1 && map_drag)){
        let delta_x = x - prev_x;
        let delta_y = y - prev_y;
        
        center[0] -= delta_x / canvas.width * horizontal_range;
        center[1] += delta_y / canvas.height * vertical_range;
        
        prev_x = x;
        prev_y = y;
        
        setBackgroundPos();
        update_objects(objects[day]);
    }
    // Режим рисования линии
    else if (is_draw.checked && map_drag){
        ctx.lineTo(x, y);
        ctx.stroke();
        
        current_line.push(screenToWorldPoint([x, y]))
    }
    // Режим рисования ломаной линии (подсветка нового сегмента)
    else if (is_line.checked && current_line.length > 0){
        update_objects(objects[day]);
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "rgba(255, 153, 0, 0.25)";
        let s_start = worldToScreenPoint(current_line[0]);
        let s_end = worldToScreenPoint(current_line[current_line.length - 1]);
        ctx.moveTo(s_end[0], s_end[1]);
        ctx.lineTo(x, y);
        ctx.lineTo(s_start[0], s_start[1]);
        ctx.fill();
        ctx.stroke();     
    }

    // Режим перемещения объектов и курсора
    if ((is_line.checked && current_line.length == 0) || (is_points.checked)){
        update_objects(objects[day]);

        if (line_drag) {
            let world_point = screenToWorldPoint([x, y]);
            // Перемещение точки
            if (cursor[1] == "point" && map_drag) {
                cursor[2] = world_point;
                objects[day][cursor[5][0]][1] = world_point;
            }

            // Перемещение сегментов ломаной линии
            else if (cursor[1] == "vertex") {
                cursor[2] = world_point;
                objects[day][cursor[5][0]][1][cursor[5][1]] = world_point;
            }
            else if (cursor[1] == "overline") {
                cursor[2] = world_point;
                objects[day][cursor[5][0]][1][cursor[5][1] + 1] = world_point;
            }
        }

        for (let i = 0; i < objects[day].length; i++) {
            let obj = objects[day][i];

            // Если точка
            if (obj[0] == "point" && is_points.checked) {
                if (!cursor[0]) {
                    let point_screen = worldToScreenPoint(obj[1]);
                    if (distance([x, y], point_screen) <= 10) {
                        set_cursor("point", obj[1], "brown", 10, [i]);
                    }
                }
            }

            // Если ломаная линия (линия фронта)
            else if (obj[0] == "frontline" && is_line.checked) {
                // Пробегаемся по вершинам ломаной
                for (let j = 0; j < obj[1].length; j++) {
                    let vertex_screen = worldToScreenPoint([obj[1][j][0], obj[1][j][1]])
                    // Устанавливаем курсор на вершине
                    if (!cursor[0] || cursor[1] == "overline") {
                        if (distance([x, y], vertex_screen) <= 10) {
                            set_cursor("vertex", obj[1][j], "brown", 10, [i, j]);
                            break;
                        }
                    }
                    // Пробегаемся по сегментам
                    if (!cursor[0]){
                        // Если не последняя точка
                        if (j != obj[1].length - 1) {
                            proj_point_world = getProjectionPoint(obj[1][j], obj[1][j + 1], screenToWorldPoint([x, y]));
                            proj_point_screen = worldToScreenPoint(proj_point_world);
                            if (distance([x, y], proj_point_screen) <= 5){
                                set_cursor("overline", [obj[1][j], obj[1][j + 1], proj_point_world], "yellow", 5, [i, j]);
                                break;
                            }
                        }
                        // Если последняя точка
                        if (j == obj[1].length - 1) {
                            proj_point_world = getProjectionPoint(obj[1][j], obj[1][0], screenToWorldPoint([x, y]));
                            proj_point_screen = worldToScreenPoint(proj_point_world);
                            if (distance([x, y], proj_point_screen) <= 5){
                                set_cursor("overline", [obj[1][j], obj[1][0], proj_point_world], "yellow", 5, [i, j]);
                                break;
                            }
                        }
                    }
                }
            }
        };
    }
});
canvas.addEventListener("mouseup", function (e) {
    let is_mouse_stable = (e.offsetX == pointer[0] && e.offsetY == pointer[1]);

    map_drag = false;
    
    // Добавляем анимацию
    if (cursor[0] && line_drag && !is_mouse_stable && day > 0) {
        ind = find_el(transitions[day], cursor[5]);
        if (is_points.checked) {
            if (ind != -1) {
                transitions[day][ind][1][1] = screenToWorldPoint([e.offsetX, e.offsetY]);
            }
            else {
                transitions[day].push([[cursor[5][0]], [objects[day - 1][cursor[5][0]][1], screenToWorldPoint([e.offsetX, e.offsetY])]]);
            }
        }
        if (is_line.checked) {
            if (is_overline) {
                console.log(cursor);
                console.log(objects[day - 1][cursor[5][0]][1][cursor[5][1]]);
                transitions[day].push([[cursor[5][0], cursor[5][1]], [[objects[day - 1][cursor[5][0]][1][cursor[5][1]][0], objects[day - 1][cursor[5][0]][1][cursor[5][1]][1]], screenToWorldPoint([e.offsetX, e.offsetY])]]);
            }
            else {
                if (ind != -1)
                    transitions[day][ind][1][1] = screenToWorldPoint([e.offsetX, e.offsetY]);
                else 
                    transitions[day].push([[cursor[5][0], cursor[5][1]], [[objects[day - 1][cursor[5][0]][1][cursor[5][1]][0], objects[day - 1][cursor[5][0]][1][cursor[5][1]][1]], screenToWorldPoint([e.offsetX, e.offsetY])]]);
            }
        }
    }
    if (line_drag) {
        // Если линия оказалась стабильной
        if (is_mouse_stable) {
            // Удаляем точку
            if (cursor[1] == "point") {
                objects[day].splice(cursor[5][0], 1);
                cursor[0] = false;
                update_objects(objects[day]);
            }
            // Удаляем вершину ломаной линии
            if (cursor[1] == "vertex") {
                objects[day][cursor[5][0]][1].splice(cursor[5][1], 1);
                cursor[0] = false;
                update_objects(objects[day]);
            }
        }
    }
    line_drag = false;
    if (is_draw.checked) {
        // Создаём линию от руки
        if (!is_mouse_stable) {
            if (current_line.length > 0) {
                objects[day].push(["line", current_line, color_el.value, width_el.value]);
                update_objects(objects[day]);
            }
        }
    }

    is_overline = false;
});

// Изменение ширины линии
width_el.addEventListener("input", function (e) {
    width_output.textContent = this.value;
});
is_draw.addEventListener("click", function (e) {
    current_line = [];
});
is_line.addEventListener("click", function (e) {
    current_line = [];
});



// СОБЫТИЯ КЛАВИАТУРЫ
document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && (e.key === 'z' || e.key === 'я')) { 
        objects[day].pop();
        update_objects(objects[day]);
    }
    if (e.key === 'Enter' && is_line.checked) {
        current_line = [];
        objects[day].splice(objects[day].length - 2, 1)
        update_objects(objects[day]);
    }
    if (e.key === 'Escape' && is_line.checked && current_line.length > 0){
        frontline_draw_deny();
    }
});




// ЗУММИРОВАНИЕ
var zoom_intencity = 0.1;
canvas.addEventListener("wheel", function (e) {

    cursor_world = screenToWorldPoint([e.offsetX, e.offsetY]);
    
    let delta_x = (cursor_world[0] - center[0]) * zoom_intencity;
    let delta_y = (cursor_world[1] - center[1]) * zoom_intencity;
    

    if (e.deltaY < 0){
        // Вниз
        horizontal_range -= horizontal_range * zoom_intencity;
        vertical_range = horizontal_range * screen_ratio;
        center[0] += delta_x;
        center[1] += delta_y;
        
    } else {
        // Вверх
        horizontal_range += horizontal_range * zoom_intencity;
        vertical_range = horizontal_range * screen_ratio;
        center[0] -= delta_x;
        center[1] -= delta_y;
    }

    setBackgroundPos();
    update_objects(objects[day]);
});



// МАСШТАБИРОВАНИЕ

function worldToScreenPoint(world_point) {
    x = (world_point[0] - (center[0] - horizontal_range / 2)) / horizontal_range * canvas.width;
    y = canvas.height - (world_point[1] - (center[1] - vertical_range / 2)) / vertical_range * canvas.height;
    return [x, y];
}

function screenToWorldPoint(screen_point) {
    x = (screen_point[0] / canvas.width) * horizontal_range + center[0] - horizontal_range / 2;
    y = (1 - screen_point[1] / canvas.height) * vertical_range + center[1] - vertical_range / 2;
    return [x, y];
}

function setBackgroundPos() {
    canvas.style.backgroundSize = backgroundSize * 2 / horizontal_range + "px";

    picture_center = worldToScreenPoint(backgroundCenterOffset);

    canvas.style.backgroundPositionX = picture_center[0] + "px";
    canvas.style.backgroundPositionY = picture_center[1] + "px";
}

function magnitude(vector) {
    return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
}

function distance(point1, point2) {
    return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
}

//Нарисовать линию по точкам
function Setline(points, color) {
    if (points.length == 0) return;
    ctx.moveTo(points[0][0], points[0][1]);
    points.forEach(point => {
        ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = color;
}



// ПРОЕКЦИЯ
function getProjectionPoint(segmentStart, segmentEnd, point) {
    const x1 = segmentStart[0], y1 = segmentStart[1];
    const x2 = segmentEnd[0], y2 = segmentEnd[1];

    const px = point[0], py = point[1];

    const dx = x2 - x1;
    const dy = y2 - y1;

    const tdx = px - x1;
    const tdy = py - y1;

    const lenSquared = dx * dx + dy * dy;

    if (lenSquared === 0) {
        return [x1, y1];
    }

    const t = (tdx * dx + tdy * dy) / lenSquared;

    const clampedT = Math.max(0, Math.min(1, t));

    const projX = x1 + clampedT * dx;
    const projY = y1 + clampedT * dy;

    return [projX, projY];
}

// ЛИНЕЙНАЯ ИНТЕРПОЛЯЦИЯ
function lerp(v1, v2, t) {
    let _x = v1[0] + (v2[0] - v1[0]) * t;
    let _y = v1[1] + (v2[1] - v1[1]) * t;
    return [_x, _y];
}




// РАБОТА С ОБЪЕКТАМИ

// Создание
function instantiate(object, position, local_offset, color, linewidth) {
    let screen_position = worldToScreenPoint(position)
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(screen_position[0], screen_position[1], 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    objects[day].push([object, position, screen_position, local_offset, color, linewidth]);
}

// ОБНОВЛЕНИЕ
function update_objects(objects_list) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objects_list.forEach(obj => {
        if (obj[0] == "point"){
            let screen_position = worldToScreenPoint(obj[1])
            obj[2] = screen_position;
    
            ctx.beginPath();
            ctx.fillStyle = obj[4];
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.arc(screen_position[0], screen_position[1], obj[5], 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        else if (obj[0] == "line"){
            ctx.beginPath();
            ctx.strokeStyle = obj[2];
            ctx.lineWidth = obj[3];
            ctx.moveTo(obj[1][0], obj[1][1]);
            obj[1].forEach(point => {
                screen_point = worldToScreenPoint(point);
                ctx.lineTo(screen_point[0], screen_point[1]);
            });
            ctx.stroke();
        }
        else if (obj[0] == "frontline"){
            ctx.beginPath();
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.strokeStyle = obj[2];
            ctx.lineWidth = obj[3];
            ctx.moveTo(obj[1][0], obj[1][1]);
            obj[1].forEach(point => {
                screen_point = worldToScreenPoint(point);
                ctx.lineTo(screen_point[0], screen_point[1]);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    });
    // Отрисовываем курсор
    if (cursor[0]) {
        if (cursor[1] == "vertex" || cursor[1] == "point"){
            screen_pos = worldToScreenPoint(cursor[2]);
            ctx.beginPath();
            ctx.fillStyle = cursor[3];
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.arc(screen_pos[0], screen_pos[1], cursor[4], 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
        if (cursor[1] == "overline"){
            screen_pos = worldToScreenPoint(cursor[2][2]);
            ctx.beginPath();
            ctx.fillStyle = cursor[3];
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.arc(screen_pos[0], screen_pos[1], cursor[4], 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
}

var animation_steps_per_frame = 100;

// [[indexed],        [start_pos, new_pos]];
// [[index, p_index], [start_pos, new_pos]];

// АНИМИРОВАНИЕ ПЕРЕМЕЩЕНИЙ
async function translate() {
    let day_animations = transitions[day];
    let day_objects = copy(objects[day - 1]);
    let step_delay = anim_delay.value * 100 / (animation_steps_per_frame + 1)
    for(let i = 0; i <= animation_steps_per_frame; i++) {
        let t = i / animation_steps_per_frame;
        day_animations.forEach(obj => {
            // точка
            if (obj[0].length == 1){
                day_objects[obj[0][0]][1] = lerp(obj[1][0], obj[1][1], t);
            }
            // вершина линии
            else {
                day_objects[obj[0][0]][1][obj[0][1]] = lerp(obj[1][0], obj[1][1], t);
            }
        });
        update_objects(day_objects);
        await delay(step_delay);
    }
}


// Поиск индекса элемента
function find_el(array, element) {
    if (element.length == 1) {
        for (let i = 0; i < array.length; i++){
            if (array[i][0][0] == element[0]) return i;
        }
        return -1;
    } 
    else {
        for (let i = 0; i < array.length; i++){
            if (array[i][0][0] == element[0] && array[i][0][1] == element[1]) return i;
        }
        return -1;
    }
}


// Отмена рисования ломаной линии фронта
function frontline_draw_deny() {
    current_line = [];
    objects[day].pop();
    objects[day].pop();
    update_objects(objects[day]);
}

// КУРСОР
function set_cursor(mode, position, color, size, obj_data) {
    cursor = [true, mode, position, color, size, obj_data];
}

function update_cursor(mousepos) {
    if (cursor[0]){
        if (is_points.checked){
            if (cursor[1] == "point") {
                pos_screen = worldToScreenPoint(cursor[2]);
                if (distance(pos_screen, mousepos) > 10){
                    cursor[0] = false;
                    return;
                }
            }
        }
        if (is_line.checked) {
            if (cursor[1] == "vertex") {
                pos_screen = worldToScreenPoint(cursor[2]);
                if (distance(pos_screen, mousepos) > 10){
                    cursor[0] = false;
                    return;
                }
            }
            if (cursor[1] == "overline") {
                let proj_point_world = getProjectionPoint(cursor[2][0], cursor[2][1], screenToWorldPoint(mousepos));
                let proj_point_screen = worldToScreenPoint(proj_point_world);
                cursor[2][2] = proj_point_world;
                if (distance(proj_point_screen, mousepos) > 10){
                    cursor[0] = false;
                    return;
                }
            }
        }
    }
}


// АНИМИРОВАНИЕ
// Обновление дня
function update_day() {
    textbox.value = `День ${day} из ${max_day}`;
    update_objects(objects[day]);
}
// Предыдущий день
button_prev.addEventListener("click", (e) => {
    if (day <= 0) return;
    day--;
    update_day();
});
// Следующий день
button_next.addEventListener("click", (e) => {
    if (day >= max_day) return;
    day++;
    update_day();
});
// Создать новый день
button_newday.addEventListener("click", (e) => {
    max_day++;
    day = max_day;
    if (is_copy_obj_newday.checked){
        let newArr = copy(objects[objects.length - 1])
        objects.push(newArr);
    }
    else objects.push([]);
    transitions.push([]);
    update_day();
});
// Удалить последний день
delete_last_day.addEventListener("click", (e) => {
    if (max_day == 0) return;
    if (day == max_day) {
        day--;
        max_day--;
    }
    else {
        max_day--;
    }
    objects.pop();
    transitions.pop();
    update_day();
});

// Рассчёт задержки анимации
anim_delay.addEventListener("input", (e) => {
    anim_text.textContent = anim_delay.value * 100;
});

// Проиграть анимацию
button_play.addEventListener("click", async (e) => {
    day = 0;
    while (day <= max_day) {
        if (day == 0) {
            await delay(anim_delay.value * 100);
        }
        else {
            await translate();
        }
        update_day();
        day++;
    }
    day--;
    update_day();
});
function delay(ms) { 
    return new Promise(resolve => setTimeout(resolve, ms)); 
}

// Копирование многомерного массива
function copy(arr) {
    let newArr = arr.map(function func(el){
        if(Object.prototype.toString.call(el) == "[object Array]"){
            return el.map(func);
        }
        return el;
    });
    return newArr;
}

// Сохранение и загрузка из файла
// Сохранение в файл
document.getElementById('exportBtn').addEventListener('click', () => { 
    const jsonString = JSON.stringify([objects, transitions]); 
    const blob = new Blob([jsonString], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'myMap.json'; 
    a.click(); 
});

// Загрузка из файла
document.getElementById('importFile').addEventListener('change', (event) => { 
    const file = event.target.files[0]; 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        const json = JSON.parse(e.target.result); 
        [objects, transitions] = json;
        max_day = objects.length;
        day = 0;
        update_objects(objects[day]);
    }; 
    reader.readAsText(file); 
});