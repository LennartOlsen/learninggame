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
var alpha = 0.4;
var gamma = 0.9;

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
  else if(num < 0.9) return 3; //probability 0.3
  else return 4;  //probability 0.1
}

/**
 * AGENT
 */
class Agent {
	constructor(name, board){
		this.name = name; this.board = board;
	}
	setTile(trainer, t){
		if(t.type == 'cliff' && trainer != undefined){
			t = this.board.getStartTile()
			trainer.updateState(t)
		}
		if(t.type == 'goal' && trainer != undefined){
			t = this.board.getStartTile()
			trainer.updateState(t)
		}
		this.tile = t
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
}

class Tile {
	constructor(type, reward, row, col){
		this.type = type; this.reward = reward; this.col = col; this.row = row;
	}
	setReward(r){this.reward = r}
	getReward(){return this.reward}

	setType(t){this.type = t}
	getType(){return this.type}
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
		this.actions = this.actions.sort(function(a,b){return a.qvalue - b.qvalue})
		return this.actions[1].qvalue
	}
	getBestAction(){
		this.actions = this.actions.sort(function(a,b){return a.qvalue - b.qvalue})

		/** Random selection between the two best */
		var possibleActions = new Array()
		possibleActions.push(this.actions[1])
		var maxVal = this.actions[1].qvalue
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
	constructor(agent, board){
		this.board = board
		this.agent = agent
		this.currentTile = agent.tile
		this.states = new Array()
		this.constructStates(board.tiles)
		this.currentState = this.getState(agent.tile)
		this.previousState = null;
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

	selectState(){
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
		var qvalue = alpha * ( statePlusOne.reward + gamma * statePlusOne.getMaxQvalue() -  actionPlusOne.qvalue )
		
		/**
		 * Update the qvalue of the current action
		 */
		actionPlusOne.updateQvalue(qvalue)

		/**
		 * Move agent to next state
		 */
		 this.agent.setTile(this, actionPlusOne.tile)
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
		this.currentState = this.getState(tile)
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

function buildTrainer(agent, board){
	return new QLearning(agent, board)
}

var board = buildBoard(4,12)
var agent = buildAgent(board)
var trainer = buildTrainer(agent, board)

var v = new Vue({
	el:"#board",
	data : {
		boardData : board,
		agentData : agent,
		trainerData : trainer
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
			trainer.selectState();
		},
	}
})