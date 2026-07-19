import 'package:flutter_test/flutter_test.dart';
import 'package:tad_driver/main.dart';

void main() {
  testWidgets('Login screen renders brand title', (WidgetTester tester) async {
    await tester.pumpWidget(const TadDriverApp());
    expect(find.text('TAD Driver'), findsOneWidget);
    expect(find.text('INICIAR SESIÓN'), findsOneWidget);
  });
}
