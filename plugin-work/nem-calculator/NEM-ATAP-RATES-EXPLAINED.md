# NEM/ATAP Rate Structure - February 2026
## Understanding Solar Import & Export Rates

---

## 📊 **CURRENT RATES (February 2026)**

### **Import Rate (Buying from Grid)**

When you import power from TNB (typically at night), you pay:

| Component | Rate | Description |
|-----------|------|-------------|
| Energy Charge | RM 0.3703/kWh | Cost of electricity |
| Capacity Charge | RM 0.0455/kWh | Grid capacity fee |
| Network Charge | RM 0.1285/kWh | Distribution cost |
| Forecast AFA (Rebate) | -RM 0.0499/kWh | Government rebate (Feb 2026) |
| **TOTAL IMPORT RATE** | **RM 0.4944/kWh** | What you actually pay |

---

### **Export Rate (Selling to TNB)**

When you export excess solar to TNB (during the day):

| Component | Rate | Description |
|-----------|------|-------------|
| Offset Rate | RM 0.3700/kWh | Energy charge only |

**Note:** You only get credited for the Energy Charge component, NOT the capacity, network, or rebate portions.

---

## ⚠️ **THE PRICE GAP EXPLAINED**

This is the critical concept that affects your ROI:

### **The Math:**
```
Export solar to grid:     EARN RM 0.37/kWh
Import same energy back:  PAY  RM 0.49/kWh
────────────────────────────────────────────
Net loss per kWh:         LOSE RM 0.12/kWh
```

### **What This Means:**

Every time you export 1 kWh of solar energy during the day and buy that same 1 kWh back at night, you **lose RM 0.12**.

This is why using the grid as your "battery" is inefficient.

---

## 💡 **WHY DOES THIS PRICE GAP EXIST?**

When you export solar:
- TNB only credits you for the **Energy Charge** (RM 0.37)
- You don't get credited for Capacity, Network charges, or AFA rebate

When you import power:
- You pay the **full rate** (RM 0.49)
- Including Energy + Capacity + Network - AFA rebate

**Result:** RM 0.49 - RM 0.37 = **RM 0.12 loss per kWh**

---

## 📈 **IMPACT ON YOUR SAVINGS**

### **Example Scenario:**

**System:** 10 kWac solar system  
**Monthly Generation:** 1,380 kWh  
**Monthly Consumption:** 800 kWh  

**Breakdown:**
- **Self-consumed:** 800 kWh (no price gap - you avoid buying at RM 0.49)
  - Savings: 800 × RM 0.49 = **RM 392**

- **Exported to grid:** 580 kWh (subject to price gap)
  - Export earnings: 580 × RM 0.37 = **RM 214.60**
  - Would cost if imported: 580 × RM 0.49 = RM 284.52
  - Price gap loss: **RM 69.92**

**Total Monthly Savings:** RM 392 + RM 214.60 = **RM 606.60**

**But could be:** RM 392 + RM 284.52 = RM 676.52 (if no price gap)

**Price gap costs you:** ~RM 70/month or ~RM 840/year

---

## 🔋 **WHY BATTERIES ARE THE SOLUTION**

### **Without Battery (Grid as "Battery"):**
```
Daytime:  Generate solar → Export excess at RM 0.37
Nighttime: Import from grid at RM 0.49
Loss:     RM 0.12 per kWh cycled
```

### **With Battery:**
```
Daytime:  Generate solar → Store excess in battery
Nighttime: Use stored battery power (no import needed)
Loss:     Only ~10% battery efficiency loss
          (RM 0.05 equivalent vs RM 0.12)
```

### **Battery ROI Improvement:**

**Additional savings with battery:**
- Avoid price gap: RM 0.12/kWh
- On 500 kWh/month that would be exported: RM 60/month
- Annual additional savings: **RM 720**
- Over 10 years: **RM 7,200+**

**This is why physical batteries have become the new gold standard for solar ROI.**

---

## 🎯 **HOW SOLANA TEC CALCULATOR HANDLES THIS**

Our calculator accurately models the NEM/ATAP rate structure:

1. **Self-Consumption Savings:**
   - Calculates how much solar you use directly
   - Values at import rate (RM 0.4944)
   - This is your PRIMARY savings (no price gap)

2. **Export Earnings:**
   - Calculates excess exported to grid
   - Values at export rate (RM 0.3700)
   - Includes the price gap loss

3. **Total Savings:**
   - Self-consumption savings + Export earnings
   - Realistic calculation of actual benefit
   - Accounts for the RM 0.12/kWh gap

---

## 📊 **RATE BREAKDOWN DISPLAY**

When you use the calculator, you'll see:

### **Import Rate Breakdown:**
```
Energy Charge:       RM 0.3703/kWh
Capacity Charge:     RM 0.0455/kWh
Network Charge:      RM 0.1285/kWh
Forecast AFA:       -RM 0.0499/kWh
─────────────────────────────────
Total Import:        RM 0.4944/kWh
```

### **Export vs Import:**
```
Export Rate:         RM 0.3700/kWh ↑ (What you earn)
Import Rate:         RM 0.4944/kWh ↓ (What you pay)
Price Gap:           RM 0.1244/kWh ⚠️ (Your loss)
```

---

## 💰 **MAXIMIZING YOUR SAVINGS**

### **Best Practices:**

1. **Maximize Self-Consumption**
   - Run appliances during daytime
   - Use solar while it's generating
   - Avoid exporting if possible

2. **Consider Battery Storage**
   - Store excess for nighttime use
   - Reduce/eliminate price gap loss
   - Significantly improve ROI

3. **Right-Size Your System**
   - Don't oversize beyond consumption
   - Excess export = price gap loss
   - Target 70-90% self-consumption

4. **Time Your Usage**
   - Washing machine: Run at noon
   - EV charging: Daytime if possible
   - Water heater: Solar hours
   - AC: Peak solar generation time

---

## 📅 **RATE UPDATES**

**Current Rates:** February 2026

**Note:** The Forecast AFA (Rebate) changes monthly based on fuel costs. The current -RM 0.0499 is for February 2026.

**Components that change:**
- ✅ Forecast AFA (monthly)
- ❌ Energy Charge (rarely)
- ❌ Capacity Charge (rarely)
- ❌ Network Charge (rarely)
- ❌ Export Rate (rarely)

---

## 🔍 **UNDERSTANDING YOUR RESULTS**

When the calculator shows your savings:

**"Monthly Savings: RM 560"** includes:
- Self-consumption value (no price gap)
- Export earnings (with price gap factored in)
- Realistic total benefit

**"25-Year Savings: RM 260,000"** accounts for:
- Price gap throughout lifetime
- Panel degradation (0.5%/year)
- Realistic long-term value

---

## ❓ **COMMON QUESTIONS**

### **Q: Why don't I get RM 0.49 when I export?**
A: You only get the Energy Charge component (RM 0.37). The Capacity and Network charges are for grid infrastructure, which you use when importing, not exporting.

### **Q: Can TNB change these rates?**
A: Yes, but typically with advance notice. Energy, Capacity, and Network charges are relatively stable. The AFA rebate adjusts monthly based on fuel costs.

### **Q: Is the price gap legal?**
A: Yes, it's part of the NEM/ATAP program structure. It reflects the different value of exported vs imported energy, plus grid infrastructure costs.

### **Q: How do I avoid the price gap?**
A: 
1. Maximize self-consumption (use solar when generating)
2. Add battery storage (store excess for later)
3. Right-size system (don't generate way more than you use)

### **Q: Will the price gap get worse?**
A: Unknown. It depends on future TNB tariff adjustments. Battery technology costs are dropping, making storage more attractive regardless.

---

## 🎯 **BOTTOM LINE**

**The NEM/ATAP price gap is real and affects your ROI.**

**Our calculator:**
- ✅ Uses exact current rates (Feb 2026)
- ✅ Accurately models the price gap
- ✅ Shows realistic savings
- ✅ Helps you make informed decisions

**Your best strategy:**
1. Use Solana Tec calculator to model your specific situation
2. Maximize self-consumption in usage patterns
3. Consider battery if significant export expected
4. Right-size your solar system

---

**Last Updated:** March 2026  
**Rates Current As Of:** February 2026  
**Calculator Version:** 2.0.5  

---

**Questions? Contact Solana Tec for personalized solar consultation!** ☀️
