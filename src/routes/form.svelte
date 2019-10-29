<script>
/*
Ported by buhrmi. Because Svelte.
Original: https://twitter.com/imuhammederdem/status/1186335420327645184
*/

import { onMount } from 'svelte';
import { fly } from 'svelte/transition';

let currentCardBackground = Math.floor(Math.random()* 25 + 1) // just for fun :D
let cardName = ""
let cardNumber = ""
let cardMonth = ""
let cardYear = ""
let cardCvv = ""
let minCardYear = new Date().getFullYear()
let amexCardMask = "#### ###### #####"
let otherCardMask = "#### #### #### ####"
let cardNumberTemp = ""
let cardType;
let isCardFlipped = false
let focusElementStyle = null
let isInputFocused = false
let refs = {}
let cardNumberMask;

onMount(function() {
	cardNumberTemp = otherCardMask;
	document.getElementById("cardNumber").focus();
})


$: cardMonth = cardMonth < minCardMonth ? '' : cardMonth
$: minCardMonth = cardYear === minCardYear ? new Date().getMonth() + 1 : 1

$: {
  if (cardNumber.match(new RegExp("^(34|37)")) != null) cardType = "amex";
	else if (cardNumber.match(new RegExp("^5[1-5]")) != null) cardType = "mastercard";
	else if (cardNumber.match(new RegExp("^6011")) != null) cardType = "discover";
  else cardType = "visa"; // default type

  cardNumberMask = cardType === "amex" ? amexCardMask : otherCardMask;

  // Credit card input masking
  for (let index = 0; index < cardNumber.length; index++) {
    if (cardNumberMask[index] == ' ' && cardNumber[index] !== ' ') cardNumber = cardNumber.substr(0, index) + ' ' + cardNumber.substr(index, cardNumber.length-index)
  }
  if (cardNumber.substr('-1') == ' ') cardNumber = cardNumber.substr(0, cardNumber.length-1)
  cardNumber = cardNumber.substr(0, cardNumberMask.length)
}

function focusInput(e) {
	isInputFocused = true;
  let targetRef = e.target.dataset.ref;
	let target = refs[targetRef];
	focusElementStyle = `opacity: 1;width: ${target.offsetWidth}px;height: ${target.offsetHeight}px;transform: translateX(${target.offsetLeft}px) translateY(${target.offsetTop}px)`
}

function blurInput() {
	setTimeout(() => {
		if (!isInputFocused) {
			focusElementStyle = null;
		}
	}, 300);
	isInputFocused = false;
}


</script>


<style>
@import url("https://fonts.googleapis.com/css?family=Source+Code+Pro:400,500,600,700|Source+Sans+Pro:400,600,700&display=swap");

* {
  box-sizing: border-box;
}
*:focus {
  outline: none;
}

.wrapper {
  min-height: 100vh;
  display: flex;
  padding: 50px 15px;
}
@media screen and (max-width: 700px), (max-height: 500px) {
  .wrapper {
    flex-wrap: wrap;
    flex-direction: column;
  }
}

.card-form {
  max-width: 570px;
  margin: auto;
  width: 100%;
}
@media screen and (max-width: 576px) {
  .card-form {
    margin: 0 auto;
  }
}
.card-form__inner {
  background: #fff;
  box-shadow: 0 30px 60px 0 rgba(90, 116, 148, 0.4);
  border-radius: 10px;
  padding: 35px;
  padding-top: 180px;
}
@media screen and (max-width: 480px) {
  .card-form__inner {
    padding: 25px;
    padding-top: 165px;
  }
}
@media screen and (max-width: 360px) {
  .card-form__inner {
    padding: 15px;
    padding-top: 165px;
  }
}
.card-form__row {
  display: flex;
  align-items: flex-start;
}
@media screen and (max-width: 480px) {
  .card-form__row {
    flex-wrap: wrap;
  }
}
.card-form__col {
  flex: auto;
  margin-right: 35px;
}
.card-form__col:last-child {
  margin-right: 0;
}
@media screen and (max-width: 480px) {
  .card-form__col {
    margin-right: 0;
    flex: unset;
    width: 100%;
    margin-bottom: 20px;
  }
  .card-form__col:last-child {
    margin-bottom: 0;
  }
}
.card-form__col.cvv {
  max-width: 150px;
}
@media screen and (max-width: 480px) {
  .card-form__col.cvv {
    max-width: initial;
  }
}
.card-form__group {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}
.card-form__group .card-input__input {
  flex: 1;
  margin-right: 15px;
}
.card-form__group .card-input__input:last-child {
  margin-right: 0;
}
.card-form__button {
  width: 100%;
  height: 55px;
  background: #2364d2;
  border: none;
  border-radius: 5px;
  font-size: 22px;
  font-weight: 500;
  font-family: "Source Sans Pro", sans-serif;
  box-shadow: 3px 10px 20px 0px rgba(35, 100, 210, 0.3);
  color: #fff;
  margin-top: 20px;
  cursor: pointer;
}
@media screen and (max-width: 480px) {
  .card-form__button {
    margin-top: 10px;
  }
}

.card-item {
  max-width: 430px;
  height: 270px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 2;
  width: 100%;
}
@media screen and (max-width: 480px) {
  .card-item {
    max-width: 310px;
    height: 220px;
    width: 90%;
  }
}
@media screen and (max-width: 360px) {
  .card-item {
    height: 180px;
  }
}
.card-item.active .card-item__side.front {
  transform: perspective(1000px) rotateY(180deg) rotateX(0deg) rotateZ(0deg);
}
.card-item.active .card-item__side.back {
  transform: perspective(1000px) rotateY(0) rotateX(0deg) rotateZ(0deg);
}
.card-item__focus {
  position: absolute;
  z-index: 3;
  border-radius: 5px;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: all 0.35s cubic-bezier(0.71, 0.03, 0.56, 0.85);
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.65);
}
.card-item__focus:after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: #08142f;
  height: 100%;
  border-radius: 5px;
  filter: blur(25px);
  opacity: 0.5;
}
.card-item__focus.active {
  opacity: 1;
}
.card-item__side {
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 20px 60px 0 rgba(14, 42, 90, 0.55);
  transform: perspective(2000px) rotateY(0deg) rotateX(0deg) rotate(0deg);
  transform-style: preserve-3d;
  transition: all 0.8s cubic-bezier(0.71, 0.03, 0.56, 0.85);
  backface-visibility: hidden;
  height: 100%;
}
.card-item__side.back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: perspective(2000px) rotateY(-180deg) rotateX(0deg) rotate(0deg);
  z-index: 2;
  padding: 0;
  height: 100%;
}
.card-item__side.back .card-item__cover {
  transform: rotateY(-180deg);
}
.card-item__bg {
  max-width: 100%;
  display: block;
  max-height: 100%;
  height: 100%;
  width: 100%;
  object-fit: cover;
}
.card-item__cover {
  height: 100%;
  background-color: #1c1d27;
  position: absolute;
  height: 100%;
  background-color: #1c1d27;
  left: 0;
  top: 0;
  width: 100%;
  border-radius: 15px;
  overflow: hidden;
}
.card-item__cover:after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(6, 2, 29, 0.45);
}
.card-item__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 40px;
  padding: 0 10px;
}
@media screen and (max-width: 480px) {
  .card-item__top {
    margin-bottom: 25px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__top {
    margin-bottom: 15px;
  }
}
.card-item__chip {
  width: 60px;
}
@media screen and (max-width: 480px) {
  .card-item__chip {
    width: 50px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__chip {
    width: 40px;
  }
}
.card-item__type {
  height: 45px;
  position: relative;
  display: flex;
  justify-content: flex-end;
  max-width: 100px;
  margin-left: auto;
  width: 100%;
}
@media screen and (max-width: 480px) {
  .card-item__type {
    height: 40px;
    max-width: 90px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__type {
    height: 30px;
  }
}
.card-item__typeImg {
  position: absolute;
  max-width: 100%;
  object-fit: contain;
  max-height: 100%;
  object-position: top right;
}
.card-item__info {
  color: #fff;
  width: 100%;
  max-width: calc(100% - 85px);
  padding: 10px 15px;
  font-weight: 500;
  display: block;
  cursor: pointer;
}
@media screen and (max-width: 480px) {
  .card-item__info {
    padding: 10px;
  }
}
.card-item__holder {
  opacity: 0.7;
  font-size: 13px;
  margin-bottom: 6px;
}
@media screen and (max-width: 480px) {
  .card-item__holder {
    font-size: 12px;
    margin-bottom: 5px;
  }
}
.card-item__wrapper {
  font-family: "Source Code Pro", monospace;
  padding: 25px 15px;
  position: relative;
  z-index: 4;
  height: 100%;
  text-shadow: 7px 6px 10px rgba(14, 42, 90, 0.8);
  userselect: none;
}
@media screen and (max-width: 480px) {
  .card-item__wrapper {
    padding: 20px 10px;
  }
}
.card-item__name {
  font-size: 18px;
  line-height: 1;
  text-transform: uppercase;
}
@media screen and (max-width: 480px) {
  .card-item__name {
    font-size: 16px;
  }
}
.card-item__nameItem {
  display: inline-block;
  min-width: 8px;
  position: relative;
	height: 0;
}
.card-item__nameItems {
  position: absolute;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-item__number {
  font-weight: 500;
  line-height: 1;
  color: #fff;
  font-size: 27px;
  margin-bottom: 35px;
  display: inline-block;
  padding: 10px 15px;
  cursor: pointer;
}
@media screen and (max-width: 480px) {
  .card-item__number {
    font-size: 21px;
    margin-bottom: 15px;
    padding: 10px 10px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__number {
    font-size: 19px;
    margin-bottom: 10px;
    padding: 10px 10px;
  }
}
.card-item__numberItem {
  width: 16px;
  display: inline-block;
  vertical-align: top;
}
.card-item__numberItem span {
  position: absolute;
}
.card-item__numberItem.active {
  width: 30px;
}
@media screen and (max-width: 480px) {
  .card-item__numberItem {
    width: 13px;
  }
  .card-item__numberItem.active {
    width: 16px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__numberItem {
    width: 12px;
  }
  .card-item__numberItem.active {
    width: 8px;
  }
}
.card-item__content {
  color: #fff;
  display: flex;
  align-items: flex-start;
}
.card-item__date {
  flex-wrap: wrap;
  font-size: 18px;
  margin-left: auto;
  padding: 10px;
  display: inline-flex;
  width: 80px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}
@media screen and (max-width: 480px) {
  .card-item__date {
    font-size: 16px;
  }
}
.card-item__dateItem {
  position: relative;
  width: 22px;
}
.card-item__dateItem span {
  position: absolute;
  display: inline-block;
}
.card-item__dateTitle {
  opacity: 0.7;
  font-size: 13px;
  padding-bottom: 6px;
  width: 100%;
}
@media screen and (max-width: 480px) {
  .card-item__dateTitle {
    font-size: 12px;
    padding-bottom: 5px;
  }
}
.card-item__band {
  background: rgba(0, 0, 19, 0.8);
  width: 100%;
  height: 50px;
  margin-top: 30px;
  position: relative;
  z-index: 2;
}
@media screen and (max-width: 480px) {
  .card-item__band {
    margin-top: 20px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__band {
    height: 40px;
    margin-top: 10px;
  }
}
.card-item__cvv {
  text-align: right;
  position: relative;
  z-index: 2;
  padding: 15px;
}
.card-item__cvv .card-item__type {
  opacity: 0.7;
}
@media screen and (max-width: 360px) {
  .card-item__cvv {
    padding: 10px 15px;
  }
}
.card-item__cvvTitle {
  padding-right: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 5px;
}
.card-item__cvvBand {
  height: 45px;
  background: #fff;
  margin-bottom: 30px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  color: #1a3b5d;
  font-size: 18px;
  border-radius: 4px;
  box-shadow: 0px 10px 20px -7px rgba(32, 56, 117, 0.35);
}
@media screen and (max-width: 480px) {
  .card-item__cvvBand {
    height: 40px;
    margin-bottom: 20px;
  }
}
@media screen and (max-width: 360px) {
  .card-item__cvvBand {
    margin-bottom: 15px;
  }
}

.card-list {
  margin-bottom: -130px;
}
@media screen and (max-width: 480px) {
  .card-list {
    margin-bottom: -120px;
  }
}

.card-input {
  margin-bottom: 20px;
}
.card-input__label {
  font-size: 14px;
  margin-bottom: 5px;
  font-weight: 500;
  color: #1a3b5d;
  width: 100%;
  display: block;
  userselect: none;
}
.card-input__input {
  width: 100%;
  height: 50px;
  border-radius: 5px;
  box-shadow: none;
  border: 1px solid #ced6e0;
  transition: all 0.3s ease-in-out;
  font-size: 18px;
  padding: 5px 15px;
  background: none;
  color: #1a3b5d;
  font-family: "Source Sans Pro", sans-serif;
}
.card-input__input:hover, .card-input__input:focus {
  border-color: #3d9cff;
}
.card-input__input:focus {
  box-shadow: 0px 10px 20px -13px rgba(32, 56, 117, 0.35);
}
.card-input__input.select {
  -webkit-appearance: none;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAeCAYAAABuUU38AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUxJREFUeNrM1sEJwkAQBdCsngXPHsQO9O5FS7AAMVYgdqAd2IGCDWgFnryLFQiCZ8EGnJUNimiyM/tnk4HNEAg/8y6ZmMRVqz9eUJvRaSbvutCZ347bXVJy/ZnvTmdJ862Me+hAbZCTs6GHpyUi1tTSvPnqTpoWZPUa7W7ncT3vK4h4zVejy8QzM3WhVUO8ykI6jOxoGA4ig3BLHcNFSCGqGAkig2yqgpEiMsjSfY9LxYQg7L6r0X6wS29YJiYQYecemY+wHrXD1+bklGhpAhBDeu/JfIVGxaAQ9sb8CI+CQSJ+QmJg0Ii/EE2MBiIXooHRQhRCkBhNhBcEhLkwf05ZCG8ICCOpk0MULmvDSY2M8UawIRExLIQIEgHDRoghihgRIgiigBEjgiFATBACAgFgghEwSAAGgoBCBBgYAg5hYKAIFYgHBo6w9RRgAFfy160QuV8NAAAAAElFTkSuQmCC");
  background-size: 12px;
  background-position: 90% center;
  background-repeat: no-repeat;
  padding-right: 30px;
}
</style>

<div class="wrapper" id="app">
  <div class="card-form">
    <div class="card-list">
      <div class="card-item" class:active={isCardFlipped}>
        <div class="card-item__side front">
          <div class="card-item__focus" class:active={focusElementStyle} style={focusElementStyle} bind:this={refs.focusElement}></div>
          <div class="card-item__cover">
            <img alt="card" src={'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/images/' + currentCardBackground + '.jpeg'} class="card-item__bg">
          </div>
          <div class="card-item__wrapper">
            <div class="card-item__top">
              <img alt="card" src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/images/chip.png" class="card-item__chip">
              <div class="card-item__type">
                {#if cardType}
                  {#each [cardType] as cardType (cardType)}
                    <img in:fly={{y:-20}} out:fly={{y:20}} src={'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/images/' + cardType + '.png'} alt="" class="card-item__typeImg">
                  {/each}
                {/if}
              </div>
            </div>
            <label for="cardNumber" class="card-item__number" bind:this={refs.cardNumber}>	
              {#each cardNumberMask as n, index (index)}
                <div class="card-item__numberItem" class:active={n.trim() === ''}>
                  {#if cardNumber.length > index}
                    <span in:fly={{y:-10}} out:fly={{y:10}}>{cardNumber[index]}</span>
                  {:else}
                    <span in:fly={{y:-10}} out:fly={{y:10}}>{n}</span>
                  {/if}
                </div>
              {/each}
            </label>
            <div class="card-item__content">
              <label for="cardName" class="card-item__info" bind:this={refs.cardName}>
                <div class="card-item__holder">Card Holder</div>
                <div class="card-item__name">
                  {#if cardName.length}
                    <div class="card-item__nameItems">
                      {#each cardName.replace(/\s\s+/g, ' ') as n, index (index)}
                        <span in:fly={{y:-6}} out:fly={{y:6}} class="card-item__nameItem" >{n}</span>
                      {/each}
                    </div>
                  {:else}
                    <div in:fly={{y:-6}}>Full Name</div>
                  {/if}
                </div>

              </label>
              <div class="card-item__date" bind:this={refs.cardDate}>
                <label for="cardMonth" class="card-item__dateTitle">Expires</label>
                <label for="cardMonth" class="card-item__dateItem">
                  {#each [cardMonth] as cardMonth (cardMonth)}
                    <span in:fly={{y:-6}} out:fly={{y:6}}>{cardMonth || 'MM'}</span>
                  {/each}
                </label>
                /
                <label for="cardYear" class="card-item__dateItem">
                  <!-- <transition name="slide-fade-up"> -->
                  {#each [cardYear] as cardYear (cardYear)}
                    <span in:fly={{y:-6}} out:fly={{y:6}}>{cardYear ? String(cardYear).slice(2,4) : 'YY'}</span>
                  {/each}
                  
                  <!-- </transition> -->
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="card-item__side back">
          <div class="card-item__cover">
            <img alt="card" src={'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/images/' + currentCardBackground + '.jpeg'} class="card-item__bg">
          </div>
          <div class="card-item__band"></div>
          <div class="card-item__cvv">
              <div class="card-item__cvvTitle">CVV</div>
              <div class="card-item__cvvBand">{cardCvv}</div>
              <div class="card-item__type">
                {#if cardType}
                  {#each [cardType] as cardType (cardType)}
                    <img in:fly={{y:-20}} out:fly={{y:20}} alt="card" src={'https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/images/' + cardType + '.png'} class="card-item__typeImg">
                  {/each}
                {/if}
              </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card-form__inner">
      <div class="card-input">
        <label for="cardNumber" class="card-input__label">Card Number</label>
        <input type="text" id="cardNumber" class="card-input__input" v-mask="generateCardNumberMask" bind:value={cardNumber} on:focus={focusInput} on:blur={blurInput} data-ref="cardNumber" autocomplete="off">
      </div>
      <div class="card-input">
        <label for="cardName" class="card-input__label">Card Holders</label>
        <input type="text" id="cardName" class="card-input__input" bind:value={cardName} on:focus={focusInput} on:blur={blurInput} data-ref="cardName" autocomplete="off">
      </div>
      <div class="card-form__row">
        <div class="card-form__col">
          <div class="card-form__group">
            <label for="cardMonth" class="card-input__label">Expiration Date</label>
            <select class="card-input__input select" id="cardMonth" bind:value={cardMonth} on:focus={focusInput} on:blur={blurInput} data-ref="cardDate">
              <option value="" disabled selected>Month</option>
              {#each Array(12) as _, n}
                <option value={(n+1) < 10 ? '0' + (n+1) : (n+1)} disabled={(n+1) < minCardMonth}>
                    {(n+1) < 10 ? '0' + (n+1) : (n+1)}
                </option>
              {/each}
            </select>
            <select class="card-input__input select" id="cardYear" bind:value={cardYear} on:focus={focusInput} on:blur={blurInput} data-ref="cardDate">
              <option value="" disabled selected>Year</option>
              {#each Array(12) as _, n}
                <option value={n + minCardYear}>
                    {n + minCardYear}
                </option>
              {/each}
            </select>
          </div>
        </div>
        <div class="card-form__col cvv">
          <div class="card-input">
            <label for="cardCvv" class="card-input__label">CVV</label>
            <input type="text" class="card-input__input" id="cardCvv" v-mask="'####'" maxlength="4" bind:value={cardCvv} on:focus={() => isCardFlipped = true} on:blur={() => isCardFlipped = false} autocomplete="off">
          </div>
        </div>
      </div>

      <button class="card-form__button">
        Submit
      </button>
    </div>
  </div>
</div>