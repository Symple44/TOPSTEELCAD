** Sample DSTV File 1 - IPE Profile with holes and cuts
** Generated for regression testing
ST
ORD-2024-001
BEAM-001
2
S355J2
6
IPE300
15
6000
300
150
7.1
10.7
71.0
3.68
EN
** Holes on top flange
BO
v  500.00  75.00  22.00  10.00
v 1000.00  75.00  22.00  10.00
v 1500.00  75.00  22.00  10.00
v 2000.00  75.00  22.00  10.00
v 2500.00  75.00  22.00  10.00
** Slotted holes
v 3000.00  75.00  22.00  10.00l  50.00  45.00
v 3500.00  75.00  22.00  10.00l  30.00  90.00
** Web holes (using v...u notation)
v 4000.00u 150.00  18.00   7.10
v 4500.00u 150.00  18.00   7.10
EN
** Contour with notch
AK
v    0.00    0.00
v 5700.00    0.00
v 5700.00  100.00
v 6000.00  100.00
v 6000.00  200.00
v 5700.00  200.00
v 5700.00  300.00
v    0.00  300.00
v    0.00    0.00
EN
** Markings
SI
v  100.00  150.00  10r"A1"
v  200.00  150.00  10r"B2"
v  300.00  150.00  15r"POS.1"
EN