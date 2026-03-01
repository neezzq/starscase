This patch updates seed and routes for qty/demo and owner grant. Ensure schema includes: Case.priceStars Int, Case.imageUrl String?, CaseItem.imageUrl String?, Inventory.imageUrl String?, User.balanceStars Int, PendingPayment.starsToAdd Int, Payment.starsAdded Int.
Also add composite unique Inventory(userId,title,rarity) as userId_title_rarity.
