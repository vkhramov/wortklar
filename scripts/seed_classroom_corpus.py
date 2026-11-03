#!/usr/bin/env python3
"""Write a small freely redistributable classroom DE corpus into graded-readers if empty."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "scripts/data/graded-readers"

# Original short classroom lines for personal study (not scraped from commercial courses).
A1 = """
Ich bin heute zu Hause.
Du bist mein bester Freund.
Er ist Lehrer in Berlin.
Wir sind sehr müde.
Ihr seid pünktlich.
Sie sind im Büro.
Ich habe keine Zeit.
Du hast ein neues Auto.
Er hat Hunger.
Wir haben viel Arbeit.
Ihr habt Glück.
Sie haben zwei Kinder.
Ich gehe zur Schule.
Du gehst nach Hause.
Er geht oft joggen.
Wir gehen ins Kino.
Ihr geht einkaufen.
Sie gehen spazieren.
Ich komme aus Russland.
Du kommst später.
Er kommt mit dem Bus.
Wir kommen am Freitag.
Ihr kommt zu spät.
Sie kommen aus Österreich.
Ich sehe den Film.
Du siehst das Haus.
Er sieht die Katze.
Wir sehen fern.
Ihr seht gut aus.
Sie sehen dich morgen.
Ich mache die Hausaufgaben.
Du machst das Bett.
Er macht einen Kaffee.
Wir machen Pause.
Ihr macht Sport.
Sie machen Musik.
Ich spreche Deutsch.
Du sprichst Englisch.
Er spricht langsam.
Wir sprechen über den Film.
Ihr sprecht laut.
Sie sprechen miteinander.
Ich lerne Vokabeln.
Du lernst schnell.
Er lernt Klavier.
Wir lernen zusammen.
Ihr lernt viel.
Sie lernen jeden Tag.
Ich wohne in München.
Du wohnst bei deinen Eltern.
Er wohnt allein.
Wir wohnen in der Stadt.
Ihr wohnt sehr zentral.
Sie wohnen im dritten Stock.
Ich arbeite im Büro.
Du arbeitest hart.
Er arbeitet als Koch.
Wir arbeiten von zu Hause.
Ihr arbeitet am Wochenende.
Sie arbeiten in einem Team.
Ich kaufe Brot.
Du kaufst Milch.
Er kauft Obst.
Wir kaufen Geschenke.
Ihr kauft online.
Sie kaufen ein neues Sofa.
Ich trinke Wasser.
Du trinkst Tee.
Er trinkt Bier.
Wir trinken Kaffee.
Ihr trinkt Saft.
Sie trinken Wein.
Ich esse Pizza.
Du isst gern Nudeln.
Er isst einen Apfel.
Wir essen zusammen.
Ihr esst zu Hause.
Sie essen im Restaurant.
Ich lese ein Buch.
Du liest die Zeitung.
Er liest eine E-Mail.
Wir lesen im Park.
Ihr lest leise.
Sie lesen den Vertrag.
Ich schreibe eine Nachricht.
Du schreibst eine Karte.
Er schreibt einen Brief.
Wir schreiben Übungen.
Ihr schreibt schnell.
Sie schreiben Berichte.
Ich fahre mit dem Zug.
Du fährst nach Berlin.
Er fährt Auto.
Wir fahren in den Urlaub.
Ihr fahrt zu langsam.
Sie fahren zur Arbeit.
Ich stehe früh auf.
Du stehst um sieben auf.
Er steht sofort auf.
Wir stehen zusammen auf.
Ihr steht spät auf.
Sie stehen pünktlich auf.
Ich rufe meine Mutter an.
Du rufst den Arzt an.
Er ruft dich später an.
Wir rufen die Polizei an.
Ihr ruft uns an.
Sie rufen den Taxi an.
Ich fange an.
Du fängst mit der Arbeit an.
Er fängt das Spiel an.
Wir fangen morgen an.
Ihr fangt bitte an.
Sie fangen den Kurs an.
Ich wasche mich.
Du wäschst dich.
Er wäscht sich.
Wir waschen uns.
Ihr wascht euch.
Sie waschen sich.
Ich freue mich.
Du freust dich.
Er freut sich.
Wir freuen uns.
Ihr freut euch.
Sie freuen sich.
Ich setze mich.
Du setzt dich.
Er setzt sich.
Wir setzen uns.
Ihr setzt euch.
Sie setzen sich.
Ich gebe dir das Buch.
Du gibst mir den Schlüssel.
Er gibt uns Zeit.
Wir geben eine Party.
Ihr gebt gute Tipps.
Sie geben Auskunft.
Ich nehme den Bus.
Du nimmst das Ticket.
Er nimmt den Anruf an.
Wir nehmen Platz.
Ihr nehmt die Tasche.
Sie nehmen das Angebot.
Ich weiß das nicht.
Du weißt die Antwort.
Er weiß Bescheid.
Wir wissen den Weg.
Ihr wisst es schon.
Sie wissen alles.
Ich kann schwimmen.
Du kannst kochen.
Er kann gut singen.
Wir können helfen.
Ihr könnt bleiben.
Sie können warten.
Ich will schlafen.
Du willst reisen.
Er will Arzt werden.
Wir wollen essen.
Ihr wollt tanzen.
Sie wollen bleiben.
Ich muss arbeiten.
Du musst lernen.
Er muss gehen.
Wir müssen warten.
Ihr müsst aufpassen.
Sie müssen entscheiden.
Ich darf hereinkommen.
Du darfst das Buch nehmen.
Er darf fernsehen.
Wir dürfen hier parken.
Ihr dürft spielen.
Sie dürfen entscheiden.
Ich mag Schokolade.
Du magst Hunde.
Er mag Fußball.
Wir mögen die Stadt.
Ihr mögt Klassik.
Sie mögen den Film.
Ich bleibe hier.
Du bleibst zu Hause.
Er bleibt ruhig.
Wir bleiben Freunde.
Ihr bleibt bitte sitzen.
Sie bleiben bis Montag.
Ich bringe dir Kaffee.
Du bringst die Kinder.
Er bringt Blumen.
Wir bringen das Essen.
Ihr bringt eure Bücher.
Sie bringen gute Nachrichten.
Ich frage den Lehrer.
Du fragst zu viel.
Er fragt nach dem Weg.
Wir fragen höflich.
Ihr fragt den Arzt.
Sie fragen nach Preisen.
Ich finde den Schlüssel.
Du findest die Lösung.
Er findet den Job gut.
Wir finden das interessant.
Ihr findet den Weg.
Sie finden eine Wohnung.
Ich höre Musik.
Du hörst Radio.
Er hört zu.
Wir hören eine Geschichte.
Ihr hört gut.
Sie hören den Alarm.
Ich verstehe die Frage.
Du verstehst mich.
Er versteht Deutsch.
Wir verstehen das Problem.
Ihr versteht die Regel.
Sie verstehen den Text.
Ich brauche Hilfe.
Du brauchst Zeit.
Er braucht Geld.
Wir brauchen Pause.
Ihr braucht Ruhe.
Sie brauchen Informationen.
Ich denke an dich.
Du denkst zu kompliziert.
Er denkt laut.
Wir denken darüber nach.
Ihr denkt an die Prüfung.
Sie denken an die Zukunft.
Ich glaube dir.
Du glaubst an Glück.
Er glaubt die Story.
Wir glauben das nicht.
Ihr glaubt an uns.
Sie glauben dem Zeugen.
Ich zeige dir die Stadt.
Du zeigst den Pass.
Er zeigt Interesse.
Wir zeigen Fotos.
Ihr zeigt den Weg.
Sie zeigen den Ausweis.
Ich öffne die Tür.
Du öffnest das Fenster.
Er öffnet den Laden.
Wir öffnen die Flasche.
Ihr öffnet die Augen.
Sie öffnen um neun.
Ich schließe das Buch.
Du schließt die Tür.
Er schließt den Laden.
Wir schließen den Vertrag.
Ihr schließt die Fenster.
Sie schließen um acht.
Ich warte auf den Bus.
Du wartest vor dem Kino.
Er wartet auf dich.
Wir warten im Café.
Ihr wartet zu lange.
Sie warten auf Nachrichten.
Ich erzähle eine Geschichte.
Du erzählst Witze.
Er erzählt von der Reise.
Wir erzählen von gestern.
Ihr erzählt spannend.
Sie erzählen die Wahrheit.
Ich versuche es noch einmal.
Du versuchst zu helfen.
Er versucht zu lächeln.
Wir versuchen eine Lösung.
Ihr versucht es bitte.
Sie versuchen den Plan.
Ich erkläre die Regel.
Du erklärst den Weg.
Er erklärt das Problem.
Wir erklären den Plan.
Ihr erklärt die Aufgabe.
Sie erklären die Situation.
Ich beginne den Tag früh.
Du beginnst mit Sport.
Er beginnt das Meeting.
Wir beginnen um zehn.
Ihr beginnt bitte jetzt.
Sie beginnen den Kurs.
Ich ende die Arbeit um fünf.
Du endest den Satz.
Er endet das Spiel.
Wir enden hier.
Ihr endet die Diskussion.
Sie enden den Vertrag.
Ich kenne ihn gut.
Du kennst die Stadt.
Er kennt den Chef.
Wir kennen uns.
Ihr kennt die Regeln.
Sie kennen den Weg.
Ich heiße Anna.
Du heißt Tom.
Er heißt Paul.
Wir heißen Willkommen.
Ihr heißt die Gäste willkommen.
Sie heißen die Kinder.
Ich schlafe tief.
Du schläfst lange.
Er schläft auf dem Sofa.
Wir schlafen im Hotel.
Ihr schlaft gut.
Sie schlafen bis zehn.
Ich laufe im Park.
Du läufst schnell.
Er läuft zur Bahn.
Wir laufen zusammen.
Ihr lauft zu langsam.
Sie laufen jeden Morgen.
Ich schwimme im See.
Du schwimmst gut.
Er schwimmt eine Stunde.
Wir schwimmen am Wochenende.
Ihr schwimmt im Pool.
Sie schwimmen im Meer.
Ich putze die Küche.
Du putzt das Bad.
Er putzt die Schuhe.
Wir putzen die Wohnung.
Ihr putzt das Auto.
Sie putzen das Büro.
Ich koche Nudeln.
Du kochst Suppe.
Er kocht für die Familie.
Wir kochen zusammen.
Ihr kocht oft.
Sie kochen vegetarisch.
Ich backe einen Kuchen.
Du backst Brot.
Er backt Plätzchen.
Wir backen am Sonntag.
Ihr backt Pizza.
Sie backen für die Party.
Ich spiele Klavier.
Du spielst Fußball.
Er spielt Gitarre.
Wir spielen Karten.
Ihr spielt im Garten.
Sie spielen Theater.
Ich treffe Freunde.
Du triffst den Arzt.
Er trifft eine Entscheidung.
Wir treffen uns um drei.
Ihr trefft euch im Café.
Sie treffen den Kunden.
Ich suche den Schlüssel.
Du suchst eine Wohnung.
Er sucht einen Job.
Wir suchen eine Lösung.
Ihr sucht den Eingang.
Sie suchen das Dokument.
Ich helfe meiner Mutter.
Du hilfst dem Freund.
Er hilft im Haushalt.
Wir helfen gerne.
Ihr helft uns bitte.
Sie helfen den Gästen.
Ich danke dir.
Du dankst dem Lehrer.
Er dankt für die Hilfe.
Wir danken dem Team.
Ihr dankt den Eltern.
Sie danken für die Einladung.
Ich lächle oft.
Du lächelst freundlich.
Er lächelt in die Kamera.
Wir lächeln höflich.
Ihr lächelt fürs Foto.
Sie lächeln vor Freude.
Ich weine nicht.
Du weinst bei Filmen.
Er weint vor Glück.
Wir weinen selten.
Ihr weint laut.
Sie weinen leise.
Ich tanze gern.
Du tanzt wunderbar.
Er tanzt auf der Party.
Wir tanzen bis spät.
Ihr tanzt im Club.
Sie tanzen Walzer.
Ich singe im Chor.
Du singst laut.
Er singt ein Lied.
Wir singen zusammen.
Ihr singt schön.
Sie singen auf der Bühne.
Ich male ein Bild.
Du malst die Wand.
Er malt Porträts.
Wir malen mit den Kindern.
Ihr malt bunt.
Sie malen die Wohnung.
Ich fotografiere die Stadt.
Du fotografierst Freunde.
Er fotografiert die Landschaft.
Wir fotografieren das Essen.
Ihr fotografiert viel.
Sie fotografieren den Event.
Ich plane den Urlaub.
Du planst die Woche.
Er plant ein Projekt.
Wir planen eine Party.
Ihr plant den Umzug.
Sie planen die Reise.
Ich organisiere das Treffen.
Du organisierst die Feier.
Er organisiert den Kurs.
Wir organisieren Hilfe.
Ihr organisiert den Raum.
Sie organisieren den Transport.
Ich reserviere einen Tisch.
Du reservierst ein Zimmer.
Er reserviert Tickets.
Wir reservieren Plätze.
Ihr reserviert online.
Sie reservieren den Saal.
Ich bestelle Pizza.
Du bestellst Kaffee.
Er bestellt das Menü.
Wir bestellen online.
Ihr bestellt Getränke.
Sie bestellen Material.
Ich bezahle bar.
Du bezahlst die Rechnung.
Er bezahlt mit Karte.
Wir bezahlen zusammen.
Ihr bezahlt den Eintritt.
Sie bezahlen die Miete.
Ich spare Geld.
Du sparst Zeit.
Er spart für ein Auto.
Wir sparen Energie.
Ihr spart Wasser.
Sie sparen für den Urlaub.
Ich verdiene genug.
Du verdienst Respekt.
Er verdient mehr.
Wir verdienen eine Pause.
Ihr verdient Dank.
Sie verdienen den Preis.
Ich verkaufe mein Rad.
Du verkaufst Kuchen.
Er verkauft Obst.
Wir verkaufen online.
Ihr verkauft Tickets.
Sie verkaufen die Wohnung.
Ich miete eine Wohnung.
Du mietest ein Auto.
Er mietet ein Büro.
Wir mieten Fahrräder.
Ihr mietet den Saal.
Sie mieten das Haus.
Ich repariere das Rad.
Du reparierst den Stuhl.
Er repariert den Computer.
Wir reparieren das Dach.
Ihr repariert die Lampe.
Sie reparieren die Straße.
Ich baue ein Regal.
Du baust ein Haus.
Er baut Modelle.
Wir bauen eine App.
Ihr baut Sandburgen.
Sie bauen eine Brücke.
Ich putze mir die Zähne.
Du ziehst die Jacke an.
Er zieht die Schuhe aus.
Wir ziehen um.
Ihr zieht euch warm an.
Sie ziehen nach Hamburg.
Ich steige in den Bus ein.
Du steigst am Bahnhof aus.
Er steigt die Treppe hoch.
Wir steigen früh ein.
Ihr steigt bitte aus.
Sie steigen in den Zug ein.
Ich falle hin.
Du fällst vom Rad.
Er fällt oft.
Wir fallen nicht auf.
Ihr fallt leise.
Sie fallen ihm auf.
Ich liege im Bett.
Du liegst auf dem Sofa.
Er liegt krank.
Wir liegen am Strand.
Ihr liegt falsch.
Sie liegen im Krankenhaus.
Ich sitze am Tisch.
Du sitzt neben mir.
Er sitzt im Büro.
Wir sitzen im Park.
Ihr sitzt zu weit weg.
Sie sitzen in der ersten Reihe.
Ich stehe an der Tür.
Du stehst im Weg.
Er steht unter Druck.
Wir stehen vor dem Museum.
Ihr steht auf der Liste.
Sie stehen zur Verfügung.
Ich hänge das Bild auf.
Du hängst die Jacke hin.
Er hängt am Telefon.
Wir hängen die Wäsche auf.
Ihr hängt die Lampe auf.
Sie hängen Plakate auf.
Ich lege das Buch hin.
Du legst die Karten.
Er legt Wert darauf.
Wir legen eine Pause ein.
Ihr legt die Handys weg.
Sie legen den Grundstein.
Ich stelle die Frage.
Du stellst dich vor.
Er stellt den Wecker.
Wir stellen uns vor.
Ihr stellt die Stühle.
Sie stellen die Weichen.
Ich nehme am Kurs teil.
Du nimmst an der Prüfung teil.
Er nimmt am Spiel teil.
Wir nehmen am Marathon teil.
Ihr nehmt am Workshop teil.
Sie nehmen am Meeting teil.
Ich gebe das Paket ab.
Du gibst den Schlüssel ab.
Er gibt die Arbeit ab.
Wir geben die Formulare ab.
Ihr gebt die Tickets ab.
Sie geben den Bericht ab.
Ich schaue fern.
Du schaust aus dem Fenster.
Er schaut auf die Uhr.
Wir schauen einen Film.
Ihr schaut genau hin.
Sie schauen die Nachrichten.
Ich passe auf die Kinder auf.
Du passt auf den Hund auf.
Er passt gut auf.
Wir passen aufeinander auf.
Ihr passt bitte auf.
Sie passen auf das Gepäck auf.
Ich räume das Zimmer auf.
Du räumst die Küche auf.
Er räumt seinen Schreibtisch auf.
Wir räumen zusammen auf.
Ihr räumt bitte auf.
Sie räumen das Lager auf.
Ich mache das Licht an.
Du machst das Radio aus.
Er macht das Fenster auf.
Wir machen die Tür zu.
Ihr macht den Fernseher an.
Sie machen das Geschäft auf.
Ich schalte den Computer ein.
Du schaltest das Licht aus.
Er schaltet um.
Wir schalten den Alarm ein.
Ihr schaltet bitte ab.
Sie schalten den Server aus.
Ich lade das Handy.
Du lädst die App.
Er lädt Freunde ein.
Wir laden die Datei.
Ihr ladet die Fahrräder.
Sie laden Gäste ein.
Ich hole dich ab.
Du holst Brot.
Er holt Hilfe.
Wir holen die Kinder ab.
Ihr holt bitte Wasser.
Sie holen das Paket ab.
Ich schicke eine E-Mail.
Du schickst ein Foto.
Er schickt Blumen.
Wir schicken die Unterlagen.
Ihr schickt die Adresse.
Sie schicken eine Einladung.
Ich erhalte eine Nachricht.
Du erhältst den Brief.
Er erhält das Paket.
Wir erhalten Unterstützung.
Ihr erhaltet die Tickets.
Sie erhalten die Bestätigung.
Ich sende das Dokument.
Du sendest die Datei.
Er sendet ein Signal.
Wir senden Glückwünsche.
Ihr sendet die Fotos.
Sie senden den Vertrag.
Ich drucke den Text.
Du druckst die Tickets.
Er druckt Fotos.
Wir drucken die Liste.
Ihr druckt die Folien.
Sie drucken die Visitenkarten.
Ich speichere die Datei.
Du speicherst den Entwurf.
Er speichert das Passwort.
Wir speichern die Fotos.
Ihr speichert die Arbeit.
Sie speichern die Daten.
Ich lösche die Nachricht.
Du löschst den Spam.
Er löscht die Datei.
Wir löschen alte Fotos.
Ihr löscht den Cache.
Sie löschen den Account.
Ich kopiere den Text.
Du kopierst die Adresse.
Er kopiert die Datei.
Wir kopieren die Übungen.
Ihr kopiert bitte nichts.
Sie kopieren das Design.
Ich ändere den Plan.
Du änderst die Meinung.
Er ändert die Adresse.
Wir ändern den Termin.
Ihr ändert die Route.
Sie ändern die Regeln.
Ich verbessere mein Deutsch.
Du verbesserst den Text.
Er verbessert die Qualität.
Wir verbessern den Service.
Ihr verbessert eure Noten.
Sie verbessern das Angebot.
Ich wiederhole die Vokabeln.
Du wiederholst den Satz.
Er wiederholt die Frage.
Wir wiederholen die Übung.
Ihr wiederholt die Regel.
Sie wiederholen den Kurs.
Ich übe jeden Tag.
Du übst Klavier.
Er übt für die Prüfung.
Wir üben zusammen.
Ihr übt die Dialoge.
Sie üben das Stück.
Ich bereite das Essen vor.
Du bereitest die Prüfung vor.
Er bereitet die Präsentation vor.
Wir bereiten die Party vor.
Ihr bereitet die Reise vor.
Sie bereiten den Vertrag vor.
Ich räume meine Sachen weg.
Du räumst das Spielzeug weg.
Er räumt die Teller weg.
Wir räumen die Kisten weg.
Ihr räumt bitte die Schuhe weg.
Sie räumen die Stühle weg.
""".strip().splitlines()

A2 = """
Am Wochenende fahren wir oft an den See.
Kannst du mir bitte mit den Hausaufgaben helfen?
Meine Schwester arbeitet seit einem Jahr in München.
Nach dem Essen spazieren wir durch den Park.
Warum wartest du so lange vor dem Kino?
Ich habe gestern einen interessanten Film gesehen.
Du solltest früher schlafen gehen.
Er hat mir sein Fahrrad geliehen.
Wir müssen den Termin noch einmal verschieben.
Ihr könntet uns am Samstag besuchen.
Sie haben uns freundlich begrüßt.
Wenn es regnet, bleibe ich zu Hause.
Ich rufe dich an, sobald ich fertig bin.
Du siehst müde aus nach der langen Reise.
Er fängt jeden Morgen mit Sport an.
Wir stehen um sechs Uhr auf und frühstücken.
Ihr kommt doch noch zur Feier, oder?
Sie freuen sich auf den Urlaub in Italien.
Ich kaufe im Supermarkt ein und koche danach.
Du gibst mir bitte Bescheid, wenn du ankommst.
Er nimmt am Sprachkurs zweimal die Woche teil.
Wir treffen uns vor dem Bahnhof um halb acht.
Ihr helft den Nachbarn beim Umzug.
Sie erklären den Gästen den Weg zum Museum.
Ich denke oft an meine Familie in der Heimat.
Du verstehst die Aufgabe besser als ich.
Er braucht mehr Zeit für das Projekt.
Wir warten auf den Bus an der Haltestelle.
Ihr erzählt spannende Geschichten aus dem Urlaub.
Sie versuchen, das Problem gemeinsam zu lösen.
Ich bestelle online und bezahle mit Karte.
Du reservierst einen Tisch für vier Personen.
Er organisiert die Besprechung für Montag.
Wir planen eine kleine Feier für unsere Freunde.
Ihr bereitet die Präsentation sorgfältig vor.
Sie verbessern ständig ihren Service.
Ich schalte den Computer ein und checke Mails.
Du holst die Kinder von der Schule ab.
Er schickt uns die Unterlagen per E-Mail.
Wir speichern die Dateien in der Cloud.
Ihr löscht bitte die alten Nachrichten.
Sie ändern den Termin auf nächsten Dienstag.
Ich wiederhole die schwierigen Verben jeden Abend.
Du übst die Dialoge mit deinem Partner.
Er bereitet das Abendessen für die Familie vor.
Wir räumen nach dem Essen die Küche auf.
Ihr passt bitte auf das Gepäck auf.
Sie laden Freunde zum Grillen ein.
Ich steige am Hauptbahnhof aus und gehe zu Fuß.
Du ziehst dich warm an, weil es kalt ist.
Er hängt das Bild über das Sofa.
Wir legen eine kurze Pause ein.
Ihr stellt euch bitte kurz vor.
Sie nehmen am Meeting per Video teil.
Ich gebe die Formulare an der Rezeption ab.
Du schaust dir den Fahrplan genau an.
Er macht das Licht aus und geht schlafen.
Wir kochen zusammen und essen danach.
Ihr spielt im Garten, während wir arbeiten.
Sie suchen eine neue Wohnung in der Innenstadt.
Ich finde den Vorschlag sehr interessant.
Du fragst den Arzt nach dem Rezept.
Er bringt Blumen für seine Mutter mit.
Wir bleiben bis Sonntag in Berlin.
Ihr dürft hier leider nicht parken.
Sie können den Antrag online ausfüllen.
Ich muss noch Milch und Brot kaufen.
Du willst unbedingt nach Österreich fahren.
Er mag klassische Musik und Jazz.
Wir mögen Spaziergänge am Fluss.
Ihr wisst doch, wo der Eingang ist.
Sie kennen die Stadt besser als wir.
Ich heiße dich herzlich willkommen.
Du schläfst lange am Sonntagmorgen.
Er läuft jeden Morgen fünf Kilometer.
Wir schwimmen im Sommer im See.
Ihr putzt das Auto vor der Reise.
Sie backen einen Kuchen für die Party.
Ich male gerne Landschaften.
Du fotografierst die schöne Aussicht.
Er verdient genug für die Miete.
Wir sparen für einen längeren Urlaub.
Ihr verkauft selbst gemachte Marmelade.
Sie mieten ein Auto für das Wochenende.
Ich repariere mein altes Fahrrad.
Du baust ein Regal für die Bücher.
Er fällt oft über die eigenen Füße.
Wir liegen am Nachmittag im Park.
Ihr sitzt zu weit weg vom Lehrer.
Sie stehen zur Verfügung, wenn Hilfe nötig ist.
""".strip().splitlines()

B1 = """
Obwohl es regnete, sind wir trotzdem spazieren gegangen.
Ich habe gehört, dass der Zug heute Verspätung hat.
Nachdem wir angekommen waren, haben wir uns ausgeruht.
Es wäre schön, wenn du früher Bescheid sagen könntest.
Seitdem er in Berlin wohnt, sieht er seine Freunde seltener.
Je mehr ich übe, desto sicherer werde ich.
Falls du Zeit hast, können wir uns am Abend treffen.
Bevor ich eine Entscheidung treffe, brauche ich mehr Informationen.
Während sie den Vortrag hielt, machten wir uns Notizen.
Damit wir pünktlich ankommen, müssen wir früher aufstehen.
Ich freue mich darauf, euch endlich wiederzusehen.
Du solltest dich bei ihm entschuldigen.
Er hat sich um die Gäste sehr gut gekümmert.
Wir haben uns entschieden, den Termin zu verschieben.
Ihr hättet uns früher anrufen können.
Sie lassen sich nicht so leicht einschüchtern.
Ich mache mir Sorgen um meine Prüfungsergebnisse.
Du kannst dich auf meine Unterstützung verlassen.
Er beschäftigt sich seit Jahren mit dieser Frage.
Wir unterhalten uns gerne über Bücher und Filme.
Ihr bemüht euch, die Regeln einzuhalten.
Sie erinnern sich noch gut an die Reise.
Ich verlasse mich darauf, dass alles klappt.
Du merkst dir Namen besser als ich.
Er stellt sich vor, dass er bald umzieht.
Wir setzen uns mit dem Problem auseinander.
Ihr meldet euch bitte rechtzeitig.
Sie kümmern sich um die Organisation.
Ich schaue mir die Unterlagen noch einmal an.
Du hörst dir den Podcast auf dem Weg zur Arbeit an.
Er denkt darüber nach, den Job zu wechseln.
Wir sprechen uns morgen noch einmal.
Ihr schreibt euch regelmäßig E-Mails.
Sie treffen sich einmal im Monat.
Ich gehe davon aus, dass er zustimmt.
Du gibst zu, dass der Plan riskant ist.
Er hält sich an die Vereinbarung.
Wir halten dich auf dem Laufenden.
Ihr bleibt mit uns in Kontakt.
Sie bringen das Projekt erfolgreich zu Ende.
Ich komme mit der Arbeit gut zurecht.
Du kommst ohne Wörterbuch zurecht.
Er kommt auf eine gute Idee.
Wir kommen um acht Uhr an.
Ihr kommt gut miteinander aus.
Sie kommen dem Ziel immer näher.
Ich stehe zu meiner Meinung.
Du stehst unter großem Druck.
Er steht für Qualität und Zuverlässigkeit.
Wir stehen hinter unserer Entscheidung.
Ihr steht uns in schwierigen Zeiten bei.
Sie stehen dem Vorschlag positiv gegenüber.
Du kostest das Essen vor dem Servieren.
Du dauerst mir zu lange.
Du passierst die Grenze ohne Probleme.
Du regnest nicht, das Wetter macht das.
Du brennst vor Neugier.
Du gratulierst ihm zum Geburtstag.
Du giltst als zuverlässig.
Ihr geltet als Teamplayer.
Ich erhöhe die Lautstärke.
Du beantragst einen neuen Pass.
Du berücksichtigst alle Argumente.
Du beruhigst das Kind.
Ich stelle die Lage klar dar.
Du stellst die Zahlen im Bericht dar.
Du eignest dich für diese Aufgabe.
Er eignet sich hervorragend dafür.
Ihr eignet euch als Partner.
Du enthältst dich der Stimme.
Er enthält wichtige Informationen.
Ihr enthält euch bitte eines Kommentars.
Ich entstehe nicht aus dem Nichts.
Du entstehst aus einer Idee.
Du ermöglichst uns den Start.
Ich ersetze das defekte Teil.
Du erstellst eine Liste.
Du erziehst die Kinder mit Geduld.
Ich stelle den Fehler schnell fest.
Du gelingst selten — dem Plan gelingt es.
Du geschehst nicht, aber es geschieht oft.
Es geschieht jeden Tag.
Ihr geschieht nichts.
Du steigerst dein Tempo.
Du überprüfst die Rechnung.
Du untersuchst die Ursache.
Ich verursache das Problem nicht.
Du brennst das Essen nicht an.
Du breitest die Decke auf dem Bett aus.
Ich raube niemanden aus.
Du raubst niemandem den Mut.
""".strip().splitlines()


def _has_content(folder: Path) -> bool:
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in {".txt", ".md"} and p.name != "README.md":
            if p.stat().st_size > 40:
                return True
    return False


def main() -> None:
    for level, rows in (("A1", A1), ("A2", A2), ("B1", B1)):
        folder = BASE / level
        folder.mkdir(parents=True, exist_ok=True)
        if _has_content(folder):
            # Replace tiny/empty seed files from failed Gutenberg
            tiny = [
                p
                for p in folder.glob("seed-*.txt")
                if p.stat().st_size < 200
            ]
            for p in tiny:
                p.unlink()
            if _has_content(folder) and not tiny:
                print(f"{level}: keep existing content")
                continue
        clean = [r.strip() for r in rows if r.strip()]
        out = folder / "seed-classroom.txt"
        out.write_text("\n".join(clean) + "\n", encoding="utf-8")
        print(f"{level}: wrote {len(clean)} -> {out}")


if __name__ == "__main__":
    main()
