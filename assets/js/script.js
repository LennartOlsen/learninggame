Vue.component('tiles', {
	template: '#tiles-template',
	props : {rows:Array}
})
Vue.component('tile', {
	template: '#tile-template',
	props : {model:Object}
})
Vue.component('agent', {
	template : '#agent-template',
	props : {agent:Object}
})

/** CONSTANTS */
var alpha = 0.1;
var gamma = 0.9;
var maxIterationsBeforeReset = 1000;

/** HELPERS */
function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

/** Gets a randoom number buy probaility
 * @returns 1 prop 0.3
 * @returns 2 prop 0.3
 * @returns 3 prop 0.3
 * @returns 4 prop 0.1
 */
function getRandom(){
  var num=Math.random();
  if(num < 0.3) return 1;  //probability 0.3
  else if(num < 0.6) return 2; // probability 0.3
  else if(num < 0.95) return 3; //probability 0.3
  else return 4;  //probability 0.05
}

/**
 * AGENT
 */
class Agent {
	constructor(name, board){
		this.name = name; this.board = board;
	}
	setTile(trainer, t){
		if(trainer != undefined){
			trainer.totalIterations += 1
			if(trainerSettings.maxIterationsBeforeReset < trainer.iterations){
				this.reset();
				return;
			}

			trainer.iterations += 1

			if(t.type == 'cliff'){
				trainer.cliffs += 1
				this.reset();
				return;
			}
			if(t.type == 'goal'){
				trainer.goals += 1
				this.reset();
				return;
			}
		}
		if(this.tile != undefined){
			this.tile.setOccupied(); //Old Tile
		}
		this.tile = t
		this.tile.setOccupied(); //New Tile
	}
	getTile(){
		return this.tile;
	}
	moveUp(){
		if(this.board.tiles[this.tile.row - 1] != undefined){
			this.tile = this.board.tiles[this.tile.row - 1][this.tile.col]
		}
	}
	moveDown(){
		if(this.board.tiles[this.tile.row + 1] != undefined){
			this.tile = this.board.tiles[this.tile.row + 1][this.tile.col]
		}
	}
	moveLeft(){
		if(this.board.tiles[this.tile.row][this.tile.col - 1] != undefined){
			this.tile = this.board.tiles[this.tile.row][this.tile.col - 1]
		}
	}
	moveRight(){
		if(this.board.tiles[this.tile.row][this.tile.col + 1] != undefined){
			this.tile = this.board.tiles[this.tile.row][this.tile.col + 1]
		}
	}
	getStyle(){
		return {
			top: this.tile.row * 60 + 'px',
			left: this.tile.col * 8.33 + '%'
		}
	}
	reset(){
		trainer.totalEpisodes += 1
		trainer.iterations = 0
		var t = this.board.getStartTile()
		trainer.updateState(t)
		this.tile = t
	}
}

class Board {
	constructor(name, tiles, rows, cols){
		this.name = name; this.tiles = tiles; this.rows = rows; this.cols = cols;
	}
	/**
	 * Returns an array of possible tiles to move to
	 */
	getPossibleTiles(tile){
		var possibleTiles = new Array()
		/** UP */
		if(this.tiles[tile.row + 1] != undefined){
			possibleTiles.push(this.tiles[tile.row + 1][tile.col])
		}
		/** DOWN */
		if(this.tiles[tile.row - 1] != undefined){
			possibleTiles.push(this.tiles[tile.row - 1][tile.col])
		}
		/** left */
		if(this.tiles[tile.row][tile.col - 1] != undefined){
			possibleTiles.push(this.tiles[tile.row][tile.col - 1])
		}
		/** Right */
		if(this.tiles[tile.row][tile.col + 1] != undefined){
			possibleTiles.push(this.tiles[tile.row][tile.col + 1])
		}
		return possibleTiles
	}

	getStartTile(){
		for(var row = 0; row < this.tiles.length; row++){
			for(var col = 0; col < this.tiles[row].length; col++){
				if(this.tiles[row][col].type == 'start'){
					return this.tiles[row][col]
				}
			}
		}
	}
	isStartTile(tile){
		if(tile != undefined && tile.type == 'start'){
			return true;
		}
		return false;
	}
}

class Tile {
	constructor(type, reward, row, col){
		this.type = type; this.reward = reward; this.col = col; this.row = row; this.numberOfVisits = 0; this.occupied = false;
	}
	setReward(r){this.reward = r}
	getReward(){return this.reward}

	setType(t){this.type = t}
	getType(){return this.type}

	getStyle(){
		var style = this.type + " ";
		style += this.occupied ? 'occupied' : '' 
		return style;
	}

	setOccupied(){
		if(this.occupied == undefined){
			this.occupied = true
		} else {
			this.occupied = !this.occupied
		}
	}
}

class State {
	constructor(tile, possibleTiles){
		this.tile = tile
		this.reward = tile.getReward()
		this.actions = this.constructActions(possibleTiles)
	}
	/** tiles : Possible tiles as array */
	constructActions(tiles) {
		var actions = new Array()
		for(var i = 0; i < tiles.length; i++){
			var action = new Action(tiles[i])
			actions.push(action)
		}
		return actions
	}

	getMaxQvalue(){
		this.actions = this.actions.sort(function(a,b){return b.qvalue - a.qvalue})
		return this.actions[1].qvalue
	}
	getBestAction(){
		this.actions = this.actions.sort(function(a,b){return b.qvalue - a.qvalue})

		/** Random selection between the two best */
		var possibleActions = new Array()
		possibleActions.push(this.actions[0])
		var maxVal = this.actions[0].qvalue
		for(var i = 1; i < this.actions.length; i++){
			if(maxVal > this.actions[i].qvalue){
				break;
			}
			if(maxVal == this.actions[i].qvalue) {
				possibleActions.push(this.actions[i])
			}
		}
		
		var actionIndex = Math.floor((Math.random() * possibleActions.length));
		return possibleActions[actionIndex]
	}

	/** Returns a random action */
	getRandomAction(){
		var actionIndex = Math.floor((Math.random() * this.actions.length));
		return this.actions[actionIndex]
	}
}

class Action {
	constructor(tile){
		this.id = guid();
		this.tile = tile;
		this.qvalue = 0;
	}

	getId(){
		return this.id
	}

	updateQvalue(v){
		this.qvalue += v
	}
}

/** TRAINER CLASS */
class QLearning {
	constructor(agent, board, settings){
		this.board = board
		this.agent = agent
		this.currentTile = agent.tile
		this.states = new Array()
		this.constructStates(board.tiles)
		this.currentState = this.getState(agent.tile)
		this.previousState = null;
		this.iterations = 0
		this.goals = 0
		this.cliffs = 0
		this.totalIterations = 0
		this.totalEpisodes = 0
		this.settings = settings
		this.actionPlusOne = null;
	}

	constructStates(tiles){
		for(var row = 0; row < tiles.length; row++){
			for( var col = 0; col < tiles[row].length; col++){
				var tile = tiles[row][col]
				this.states.push(
					new State(tile, this.board.getPossibleTiles(tile))
				)
			}
		}
	}

	selectQNext(){
		this.currentState = this.getState(agent.tile)
		/**
		 * From this state we select an action
		 */
		if(getRandom() != 4){
			var actionPlusOne = this.currentState.getBestAction();
		} else {
			var actionPlusOne = this.currentState.getRandomAction();
		}
		
		/**
		 * What state does this action lead to
		 */
		var statePlusOne = this.getState(actionPlusOne.tile)

		/** 
		 * Alpha = learning rate (ex = 0.5)
		 * T = Time (step)	
		 * gamma = discount factor (ex = 1)
		 * a* All possible actions
		 */
		/** Q(state(T), action(T)) += alpha[reward(T+1) + gamma * max ( Q(state(T+1), a*) ) - Q(state(T), action(T)) ] */
		var qvalue = this.settings.alpha * ( statePlusOne.reward + this.settings.gamma * statePlusOne.getMaxQvalue() -  actionPlusOne.qvalue )
		
		/**
		 * Update the qvalue of the current action
		 */
		actionPlusOne.updateQvalue(qvalue)

		/**
		 * Move agent to next state
		 */
		 this.agent.setTile(this, actionPlusOne.tile)
		 this.previousState = this.currentState
		 this.currentState = statePlusOne
		
	}

	selectSarsaNext(){
		this.currentState = this.getState(agent.tile)
		/**
		 * From this state we select an action
		 */
		if( this.actionPlusOne == null){
			if(getRandom() != 4){
				var actionToDo = this.currentState.getBestAction();
			} else {
				var actionToDo = this.currentState.getRandomAction();
			}
		} else {
			var actionToDo = this.actionPlusOne
		}
		
		/**
		 * What state does this action lead to
		 */
		var statePlusOne = this.getState(actionToDo.tile)

		/** 
		 * Alpha = learning rate (ex = 0.5)
		 * T = Time (step)	
		 * gamma = discount factor (ex = 1)
		 * a* All possible actions
		 */
		/** Q(state(T), action(T)) += alpha[reward(T+1) + gamma * Q(state(T+1), action(T+1)) - Q(state(T), action(T)) ] */
		
		if(getRandom() != 4){
			this.actionPlusOne = statePlusOne.getBestAction();
		} else {
			this.actionPlusOne = statePlusOne.getRandomAction();
		}

		var qvalue = this.settings.alpha * ( statePlusOne.reward + this.settings.gamma * this.actionPlusOne.qvalue - actionToDo.qvalue )
		
		/**
		 * Update the qvalue of the current action
		 */
		actionToDo.updateQvalue(qvalue)

		/**
		 * Move agent to next state
		 */
		 this.agent.setTile(this, actionToDo.tile)
		 this.previousState = this.currentState
		 this.currentState = statePlusOne
		
	}

	getState(tile){
		for(var i = 0; i < this.states.length; i++){
			if(this.states[i].tile == tile){
				return this.states[i]
			}
		}
	}
	
	/** Basically used for reset */
	updateState(tile){
		this.currentState = undefined
		this.actionPlusOne = undefined
		this.agent.setTile(undefined, tile)
	}

	debug() {
		var debug = {
			totalEpisodes : this.totalEpisodes,
			averagePathLegnth : this.totalIterations / this.totalEpisodes,
			goals : this.goals,
			cliffs : this.cliffs,
			iterations : this.iterations,
			totalIterations : this.totalIterations,
			settings : this.settings,
		}
		return debug
	}
}

class TrainerSettings {
	construct(){
		this.gamma = 0.9
		this.alpha = 0.1
		this.maxIterationsBeforeReset = 1000
		this.speed = 10 /** Lower is faster */
	}
}

function buildBoard(rows, cols){
	var tiles = new Array();
	for(row = 0; row < rows; row++){
		tiles[row] = new Array();
		for(col = 0; col < cols; col++){
			var tile = new Tile('tile', -1, row, col);
			if( row == rows - 1 ){
				tile.setReward(-100)
				tile.setType('cliff')
				if( col == 0 ){
					tile.setReward(0)
					tile.setType('start')
				}
				if(col == cols - 1){
					tile.setReward(100)
					tile.setType('goal')
				}
			}
			tiles[row].push(tile)
		}
	}
	
	return new Board('game board',tiles,rows,cols)
}

function buildAgent(boardData) {
	var a = new Agent("agent", boardData)
	for(row = 0; row < boardData.tiles.length; row++){
		for(col = 0; col < boardData.tiles[row].length; col++){
			if(boardData.tiles[row][col].getType() == 'start'){
				a.setTile(undefined, boardData.tiles[row][col])
			}
			
		}
	}
	return a
}

function buildTrainer(agent, board, settings){
	return new QLearning(agent, board, settings)
}

var board = buildBoard(4,12)
var agent = buildAgent(board)
var trainerSettings = new TrainerSettings();
var trainer = buildTrainer(agent, board, trainerSettings)
var trainerLoopId

var v = new Vue({
	el:"#board",
	data : {
		boardData : board,
		agentData : agent,
		trainerData : trainer,
		trainerSettings : trainerSettings
	},
	methods: {
		moveUp: function(){
			 agent.moveUp();
		},
		moveDown: function(){
			agent.moveDown();
		},
		moveLeft: function(){
			agent.moveLeft();
		},
		moveRight: function(){
			agent.moveRight();
		},
		selectNext: function(){
			trainer.selectQNext();
		},
		startQTrainer: function(){
			/** One fucking spin lock to rule them all */
			trainerLoopId = setInterval(function(){
				if(trainer.totalEpisodes < 1000){
					trainer.selectQNext()
				}
			}, trainerSettings.speed)
		}, 
		startSarsaTrainer: function(){
			/** One fucking spin lock to rule them all */
			trainerLoopId = setInterval(function(){
				if(trainer.totalEpisodes < 1000){
					trainer.selectSarsaNext()
				}
			}, trainerSettings.speed)
		}, 
		pauseTrainer : function(){
			clearInterval(trainerLoopId)
		}
	}
})