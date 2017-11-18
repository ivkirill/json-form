;(function(window, document) {
	// вспомогательная функция расширения объекта
  	function extend(obj) {
		obj = obj || {};

		// если передан не обьект, вернем пустой обьект
		if (!Object.prototype.toString.call(obj) === '[object Object]') return {};

		for (var i = 1; i < arguments.length; i++) {
			if (!arguments[i]) continue;
			for (var key in arguments[i]) {
				if (arguments[i].hasOwnProperty(key)) {
					var value = arguments[i][key];
					if (value === "true") value = true;
					else if (value === "false") value = false;
					obj[key] = value;
				}
			}
		}

		return obj;
	}

	// функция-конструтор формы
	var Form = function(config) {
		// дефолтные параметры
		var defaults = {
			// данные
			data: {
				// если нужно получить по URL
				url: null,
				// если они уже переданы в конструктор при создании
				raw: null
			},
			// селекторы для привязки данных
			selector: {
				// селектор куда будет вставлена форма
				form: null
			},
			// метод формы
			method: 'POST',
			// URL для отправки формы
			action: window.location.href		
		}

		// если передан конфиг, расширяем дефолтные параметры через него
		if(config) {
			config = extend(defaults, config);

			if( !config.data.raw && !config.data.url ) throw new Error('Нет данных для генерации формы', 1);
			if( !config.selector.form ) throw new Error('Не передан селектор для элемента формы', 2);
			if( !document.querySelector(config.selector.form) ) throw new Error('Нет элемента на странице с переданным селектором: "'+config.selector.form+'"', 3);
		}

		// данные JSON для формы
		this.json = null;
		// массив групп (заголовок поля и обертка поля)
		this.groups = [];

		// генерация формы
		this.createForm = function() {
			// переданный элемент на обработку
			this.wrapper = document.querySelector(config.selector.form);
			
			// создаем форму
			if ( this.wrapper.tagName === 'FORM' ) this.form = this.wrapper
			else {
				this.form = document.createElement('form');
				this.wrapper.appendChild(this.form);
			}

			// устанавливаем атрибуты для формы
			this.form.setAttribute('method', config.method);
			this.form.setAttribute('action', config.action);
			this.form.setAttribute('validate','validate');

			return this;
		}

		// устанавливаем данные
		this.setData = function(json) {
			this.json = (typeof json == 'string') ? JSON.parse(json) : json;
		}

		// получаем данные
		this.getData = function(url) {
			// сохраняем контекст
			var self = this;
			var xhr = new XMLHttpRequest();
			var data = null;

			// обертка try для того чтобы работало на локалке
			try {
				// делаем синхронный запрос
				xhr.open('GET', url, false);				
				xhr.send();

				// если ответ с ошибкой
				if (xhr.status != 200) {
					// выкидываем ошибку #
					throw new Error('Ошибка ответа сервера', 4);
				}
				// если все ок
				else {
					data = xhr.responseText;
				}
			}
			catch(e) {
				// тут мы хитрим и берем встроенный JSON, если запускаем на локалке
				data = test_json;
			}

			return data;
		}
		
		// генерируем поля
		this.createFields = function(obj) {
			for(key in obj) {
				if( key == 'prvId' ) this.createField(key, obj[key], 'hidden');
				else if( /^prv/.test(key) ) this.createCaption(key, obj[key]);
				else if( key == 'fields' ) this.createFields(obj[key]);
				else this.createField(key, obj[key]);
			};
		}
		
		// генерация отдельного поля
		this.createField = function(key, data, type) {
			var self = this;
			
			type = type || function() {
				var type;
				if(data.fieldType == 'tSelectRadio') type = 'radio'
				else if (data.fieldType == 'tText') type = 'text'
				else if (data.fieldType == 'tDate') type = 'month'
				else if (data.fieldType == 'tAmount') type = 'number'
				else type = 'text';
				
				return type;
			}();
			
			// если тип hidden, создаем поле напрямую в форме и выходим из функции
			if( type == 'hidden' ) {
				var input = document.createElement('input');
				input.setAttribute('type', type);
				input.setAttribute('name', key);
				input.setAttribute('value', data);
				this.form.append(input);
				return;
			}

			// создаем группу для поля
			var group = this.createRow(data.orderNum);
			// добавляем текст в заголовок элемента group.title
			var title = document.createElement('span');
			title.innerText = data.fieldLabel;
			group.title.append(title);

			// если тип радиокнопка
			if( type == 'radio' && data.preValues ) {
				// сортируем по ключу orderNum
				data.preValues = data.preValues.sort(function(a,b) {
					return a.orderNum - b.orderNum;
				});

				// перебираем все элементы массива
				for(i=0; data.preValues.length > i; i++ ) {
					// создаем элементы DOM
					var label = document.createElement('label');
					var input = document.createElement('input');
					var caption = document.createElement('span');
					
					// устанавливаем нужные атрибуты
					label.setAttribute('class', 'label-type-radio');
					input.setAttribute('type', type);
					input.setAttribute('name', data.fieldId);
					input.setAttribute('value', data.preValues[i].value);
					input.setAttribute('require', 'require');
					
					// событие выбора для элемента
					input.onchange = function() {
						console.log(self);
						
						console.log( self.groups );
					}
					
					// поставим первый элемент активным
					if(i === 0) input.setAttribute('checked', 'checked');
					
					caption.innerHTML = data.preValues[i].caption;
					
					// добавляем input и caption в DOM label
					label.append( input );
					label.append( caption );
					
					// добавляем labal в DOM group.holder
					group.holder.append(label);
				};
			}
			
			// если тип text, month, number
			else {
				var input = document.createElement('input');
				input.setAttribute('type', type);
				input.setAttribute('name', data.fieldId);
				
				/*
				* если тип number, добавим несколько доп атрибутов
				* # по идее мы должны сделать это только для всех tAmount,
				* а остальные number оставлять нативными
				*/
				if( type == 'number' ) {
					input.setAttribute('min', 0);
					input.setAttribute('step', '0.01');
					
					// type = number не дает вводить точку с клавиатуры, придется сделать его text
					input.setAttribute('type', 'text');
					
					// функция автозамены при вводе символов
					input.oninput = function(e) {
						this.value = this.value.toString()
						// замена запятой
						.replace(/\,/g,'.')
						// убиваем все символы кроме цифр и точки
						.replace(/[^0-9.]/g,'')
						// сохраняем число по паттерну и только его
						.replace(/(^\d+)(\.?)(\d{0,2})?(.*)?$/g, function(match, a, b, c, d) {
							console.log(match, a, b, c, d);
							return a + '' + ((b) ? b : '') + ((c) ? c : '');
						});
					}
				}
				
				group.holder.append(input);	
			}
		};

		// генерация обертки элемента
		this.createRow = function(num) {
			// строка
			var group = document.createElement('div');
			// заголовок
			var title = document.createElement('div');
			// обертка для элемента
			var holder = document.createElement('div');
			
			// устанавливаем классы
			group.setAttribute('class', 'form-group');
			title.setAttribute('class', 'form-group-title');
			holder.setAttribute('class', 'form-group-field');
			
			// добавляем title и holder в DOM группы
			group.append( title );
			group.append( holder );
			
			// добавляем обертку во внутреннюю коллекцию оберток
			// не проверяем дубли в orderNum, при одинаковых значенияем остается только последний элемент
			this.groups[num || 0] = group;
			
			return {
				group: group,
				title: title,
				holder: holder
			};
		}
		
		// вставляем обертки в форму
		this.insertRows = function() {
			var self = this;
			
			this.groups.forEach(function(group) {
				if( group ) self.form.append( group );
			});
		}
		
		// генерация заголовка
		this.createCaption = function(key, data) {
			// создаем элемент
			var caption = document.createElement('div');
			
			caption.setAttribute('class', 'form-caption');
			// вставляем текст заголовка
			caption.innerHTML = data;
			// добавляем элемент DOM формы
			this.form.appendChild(caption);
		}
		
		// генерация кпопки Submit
		this.createSubmit = function(key, data) {
			// создаем элемент
			var submit = document.createElement('button');
			
			submit.setAttribute('type', 'submit');
			submit.setAttribute('class', 'button-submit');
			submit.innerText = 'Отправить';
			// добавляем элемент DOM формы
			this.form.appendChild(submit);
		}
		

		// инициализация
		this.init = function() {
			// генерация элемента формы
			this.createForm();
			
			// получаем данные JSON
			if( config.data.raw ) this.setData(config.data.raw);
			else this.setData(this.getData(config.data.url));
			
			// генерируем поля формы
			this.createFields(this.json);
			
			// вставляем обертки в форму
			this.insertRows();
			
			// вставляем кнопку Submit
			this.createSubmit();
			
		}
		
		return this.init();
	}

	// добавляем в window, по идее тут можно переменовать этот объект, чтобы избежать конфликтов.
	window.Form = Form;
})(window, document);

var test_json = {
	"prvId":2751,
	"prvName":"Банк развития бизнеса",
	"prvDesc":"ООО \"Банк развития бизнеса\"",
	"fields":[
	   {
		  "orderNum":1,
		  "fieldId":"accountType",
		  "fieldType":"tSelectRadio",
		  "fieldLabel":"Тип счета",
		  "preValues":[
			 {
				"orderNum":1,
				"value":"cardNum",
				"caption":"Номер карты"
			 },
			 {
				"orderNum":2,
				"value":"accNum",
				"caption":"Номер счета"
			 }
		  ]
	   },
	   {
		  "orderNum":3,
		  "fieldId":"cardNumber",
		  "fieldType":"tText",
		  "fieldLabel":"Номер карты",
		  "preValues":null
	   },
	   {
		  "orderNum":4,
		  "fieldId":"cardDate",
		  "fieldType":"tDate",
		  "fieldLabel":"Дата действия карты",
		  "preValues":null
	   },
	   {
		  "orderNum":5,
		  "fieldId":"accountNumber",
		  "fieldType":"tText",
		  "fieldLabel":"Номер счета",
		  "preValues":null
	   },
	   {
		  "orderNum":7,
		  "fieldId":"amount",
		  "fieldType":"tAmount",
		  "fieldLabel":"Сумма платежа",
		  "preValues":null
	   }
	]
 }