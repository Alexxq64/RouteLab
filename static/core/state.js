// static/core/state.js

window.state = {
    map: null,

    stops: [],
    edges: [],
    routes: [],

    currentSelectedRoute: null,

    layers: {
        markers: null,
        routes: null,
        edges: null
    },

    modes: {
        addStop: false,
        addEdge: false,
        pointToPoint: false
    },

    points: {
        saved: [],
        selectedStartId: null,
        selectedEndId: null,
        startPoint: null,
        endPoint: null,
        startPointMarker: null,
        endPointMarker: null
    },

    history: {
        routeHistory: []
    }
};