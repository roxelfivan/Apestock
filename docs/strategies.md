# Strategies

Apestock ships **25** daily logics. Signals are computed on the **close**. The fill is the **next open**. Chart triangles are those fills, not the committee vote.

## Trend

| Label | Code | Idea |
| --- | --- | --- |
| SMA crossover | `MA_CROSSOVER` | Short SMA crosses long SMA |
| EMA crossover | `EMA_CROSSOVER` | Same with exponential averages |
| WMA crossover | `WMA_CROSSOVER` | Same with weighted averages |
| Hull moving average | `HMA` | Close crosses the Hull MA |
| Supertrend | `SUPERTREND` | ATR trailing stop flips long / flat |
| Parabolic SAR | `PSAR` | Dots flip below (buy) or above (sell) |
| Ichimoku TK cross | `ICHIMOKU` | Tenkan crosses Kijun |
| ADX / DMI | `ADX` | +DI crosses −DI |
| Aroon | `AROON` | Aroon Up crosses Aroon Down |

## Oscillators

Leave an extreme, or a line crosses its signal / zero.

| Label | Code |
| --- | --- |
| RSI mean reversion | `RSI` |
| Stochastic oscillator | `STOCHASTIC` |
| Stochastic RSI | `STOCH_RSI` |
| MACD crossover | `MACD` |
| Percentage price oscillator | `PPO` |
| TRIX | `TRIX` |
| Commodity channel index | `CCI` |
| Williams %R | `WILLIAMS_R` |
| Ultimate oscillator | `ULTIMATE` |
| Awesome oscillator | `AWESOME` |
| Time-series momentum | `MOMENTUM` |
| Rate of change | `ROC` |

## Channels

| Label | Code | Idea |
| --- | --- | --- |
| Bollinger bounce | `BOLLINGER` | Close reclaims the lower band; fades the upper |
| Keltner channels | `KELTNER` | Same idea with ATR bands |
| Donchian breakout | `DONCHIAN` | Close breaks the prior N-day high or low |

## Buy and hold

**Buy and hold** (`BUY_HOLD`) spends full capital on the first fill and holds. It is the equity-chart benchmark and is **not** a committee voter.

## Parameters

Changing the strategy loads that rule's defaults (50/200 for SMA, 14/30/70 for RSI, and so on). The form validates periods before Run. Sweep and walk-forward use small built-in grids for a subset of rules — see [Research](research.md).
