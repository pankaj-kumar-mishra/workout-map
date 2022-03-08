'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // last 10 digit of date string
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // clickCount() {
  //   this.clicks++;
  // }
}

// Now inherit both walking/cycling types from workout class
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    // NOTE below method declared in parent class.
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 10, 30, 200);
// const cycle1 = new Cycling([39, -12], 5, 10, 30);
// console.log(run1, cycle1);

// APPLICATION CLASS (ON LOAD event)
class App {
  // "#" => private field
  #map;
  #mapZoom = 13;
  #mapEvt;
  #workouts = [];

  constructor() {
    // on new object create call the function immediately
    this._getPosition();

    // get data from local storage
    this._getWorkouts();

    // attach event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function (err) {
          console.log({ err });
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    // const myLocation = `https://www.google.com/maps/@${latitude},${longitude}`;
    // console.log(myLocation);
    //   id='map'
    this.#map = L.map('map').setView(coords, this.#mapZoom); // 13 => zooming map

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvt = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // [x] get form data
    const { lat, lng } = this.#mapEvt.latlng;

    const type = inputType.value;
    const distance = +inputDistance.value; // "+" is converting string to number
    const duration = +inputDuration.value;
    let workout;

    // [x] if workout running then create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check data valid or not
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Invalid input');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // [x] if workout cycling then create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check data valid or not
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Invalid input');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // [x] add new object to workout array
    this.#workouts.push(workout);
    // console.log(this.#workouts);

    // [x] render workout on map as marker
    this._renderWorkoutMarker(workout);

    // [x] render workout on list
    this._renderWorkout(workout);

    // [x] hide form and Clear the inputs
    this._hideForm();

    // [x] save new workout in local storage
    this._saveWorkouts();
  }

  _renderWorkoutMarker(workout) {
    const popup = L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    });
    const popupContent = `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
      workout.description
    }`;
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(popup)
      .setPopupContent(popupContent)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
  `;

    if (workout.type === 'running') {
      html += `
    <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
      </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
    <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
        </div>
        </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return;
    // NOTE el.dataset.id => all custom data attribute => <li data-id="some id"></li>
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // workout.clickCount();
  }

  _saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getWorkouts() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (data?.length > 0) {
      this.#workouts = data;

      this.#workouts.forEach(work => {
        this._renderWorkout(work);
      });
    }
  }

  resetApp() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
